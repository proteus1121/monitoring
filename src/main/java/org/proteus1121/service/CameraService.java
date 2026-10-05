package org.proteus1121.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.camera.Camera;
import org.proteus1121.model.dto.camera.CameraVision;
import org.proteus1121.model.dto.controller.CameraBoardRegistered;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.BoardModel;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.DisplayLanguage;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Live view of ESP32-CAM boards. The board detects flame itself and sends frames only while somebody watches:
 * the first viewer of a camera asks it for frames over MQTT (repeated every 10 s, the board stops 30 s after
 * the last request), the frames and the detector's result with each of them are kept in memory - the latest
 * one per camera, nothing is recorded - and relayed to every viewer as MJPEG.
 * <p>
 * Frames are keyed by the topic's user and board: a board can publish only under its owner's topics, so it
 * cannot put frames into the camera of another account.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CameraService {

    // how long a viewer waits for the next frame before sending the last one again
    private static final long FRAME_WAIT_MS = 5000;
    // a frame older than this is not shown again: the camera is gone
    private static final long FRAME_MAX_AGE_MS = 60000;
    // without any frame for this long the stream ends; the page connects again
    private static final long GIVE_UP_MS = 30000;
    private static final long FLAME_DEVICE_DELAY_MS = 60000;
    // an alarm's frame older than this is from another alarm
    private static final long ALARM_FRAME_MAX_AGE_MS = 120000;

    private final ControllerService controllerService;
    private final ControllerRepository controllerRepository;
    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final ControllerPublisher controllerPublisher;
    private final ObjectMapper objectMapper;

    private final Map<String, Feed> feeds = new ConcurrentHashMap<>();

    /**
     * @param vision what the detector saw in this frame
     */
    public record Frame(byte[] jpeg, long seq, long receivedAt, CameraVision vision) {
    }

    private static final class Feed {
        final Long userId;
        final String hardwareId;
        final AtomicInteger viewers = new AtomicInteger();
        volatile Frame frame;
        // the board sends the result first, then its frame
        volatile CameraVision vision;
        // the frame the latest alarm was raised on
        volatile Frame alarmFrame;
        long seq;

        Feed(Long userId, String hardwareId) {
            this.userId = userId;
            this.hardwareId = hardwareId;
        }
    }

    private Feed feed(Long userId, String hardwareId) {
        return feeds.computeIfAbsent(userId + "/" + hardwareId, key -> new Feed(userId, hardwareId));
    }

    // --- from the boards ---

    public void handleVision(Long userId, String hardwareId, String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            feed(userId, hardwareId).vision = new CameraVision(
                    node.path("a").asInt() == 1,
                    node.path("r").asDouble(),
                    node.path("var").asDouble(),
                    node.path("c").asInt(),
                    node.path("n").asInt(),
                    ints(node.get("b")),
                    node.path("w").asInt(),
                    node.path("h").asInt(),
                    node.path("fps").asDouble(),
                    node.path("cfps").asDouble(),
                    ints(node.get("m")),
                    LocalDateTime.now());
        } catch (Exception e) {
            log.warn("Bad vision message from {}: {}", hardwareId, message);
        }
    }

    private static List<Integer> ints(JsonNode array) {
        if (array == null || !array.isArray()) {
            return null;
        }
        List<Integer> values = new ArrayList<>();
        array.forEach(value -> values.add(value.asInt()));
        return values;
    }

    public void handleFrame(Long userId, String hardwareId, byte[] jpeg) {
        Feed feed = feed(userId, hardwareId);
        synchronized (feed) {
            feed.frame = new Frame(jpeg, ++feed.seq, System.currentTimeMillis(), feed.vision);
            feed.notifyAll();
        }
    }

    /**
     * The frame the board raised an alarm on; it is also the camera's latest frame.
     */
    public void handleAlarmFrame(Long userId, String hardwareId, byte[] jpeg) {
        Feed feed = feed(userId, hardwareId);
        synchronized (feed) {
            Frame frame = new Frame(jpeg, ++feed.seq, System.currentTimeMillis(), feed.vision);
            feed.frame = frame;
            feed.alarmFrame = frame;
            feed.notifyAll();
        }
        log.info("Camera {} raised a flame alarm, frame of {} bytes", hardwareId, jpeg.length);
    }

    /**
     * The frame of the current alarm of a camera's flame device with the flame's box drawn on it, for the
     * notifications. The board sends it right after the alarm, so it may still be on its way: waits up to
     * {@code waitMs} for it.
     *
     * @return the JPEG, or null when the device is not a camera's or no frame came
     */
    public byte[] alarmImage(Long deviceId, long waitMs) throws InterruptedException {
        DeviceEntity device = deviceRepository.findById(deviceId).orElse(null);
        if (device == null || device.getSensorModel() != SensorModel.CAMERA || device.getControllerId() == null) {
            return null;
        }
        var controller = controllerRepository.findById(device.getControllerId()).orElse(null);
        if (controller == null) {
            return null;
        }
        Feed feed = feed(controller.getUserId(), controller.getHardwareId());
        long deadline = System.currentTimeMillis() + waitMs;
        synchronized (feed) {
            while (feed.alarmFrame == null
                    || System.currentTimeMillis() - feed.alarmFrame.receivedAt() > ALARM_FRAME_MAX_AGE_MS) {
                long left = deadline - System.currentTimeMillis();
                if (left <= 0) {
                    return null;
                }
                feed.wait(left);
            }
        }
        Frame frame = feed.alarmFrame;
        return FlameImage.annotate(frame.jpeg(), frame.vision());
    }

    // --- to the site ---

    public List<Camera> getCameras(Long userId) {
        return controllerService.getControllers(userId).stream()
                .filter(controller -> BoardModel.isCamera(controller.getBoard()))
                .map(controller -> {
                    Feed feed = feeds.get(controller.getUserId() + "/" + controller.getHardwareId());
                    Long flameDeviceId = deviceRepository.findByControllerId(controller.getId()).stream()
                            .filter(device -> device.getSensorModel() == SensorModel.CAMERA)
                            .map(DeviceEntity::getId)
                            .findFirst().orElse(null);
                    return new Camera(controller.getId(), controller.getName(), controller.getHardwareId(),
                            controller.getRole(), controller.isOnline(), controller.getCameraFound(),
                            controller.getFirmwareVersion(), flameDeviceId, feed == null ? null : feed.vision);
                })
                .toList();
    }

    /**
     * The latest frame of a camera the user can see, null when none came yet.
     */
    public Frame latestFrame(Long controllerId, Long userId) {
        Controller camera = viewable(controllerId, userId);
        Feed feed = feeds.get(camera.getUserId() + "/" + camera.getHardwareId());
        return feed == null ? null : feed.frame;
    }

    public CameraVision vision(Long controllerId, Long userId) {
        Controller camera = viewable(controllerId, userId);
        Feed feed = feeds.get(camera.getUserId() + "/" + camera.getHardwareId());
        return feed == null ? null : feed.vision;
    }

    /**
     * Checks the access; call before the response is committed, then {@link #stream}.
     */
    public Controller viewable(Long controllerId, Long userId) {
        return controllerService.getControllers(userId).stream()
                .filter(controller -> controller.getId().equals(controllerId) && BoardModel.isCamera(controller.getBoard()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Camera " + controllerId + " not found"));
    }

    /**
     * Writes the camera's frames as multipart/x-mixed-replace parts until the viewer goes away (the write fails)
     * or no frame comes for {@link #GIVE_UP_MS}. Blocks the calling thread meanwhile.
     */
    public void stream(Controller camera, OutputStream out) throws IOException {
        Feed feed = feed(camera.getUserId(), camera.getHardwareId());
        addViewer(feed);
        try {
            long seq = 0;
            long lastNew = System.currentTimeMillis();
            Frame current = feed.frame;
            // the last frame right away, the page does not stay blank while the board starts sending
            if (current != null && System.currentTimeMillis() - current.receivedAt() < FRAME_MAX_AGE_MS) {
                writePart(out, current.jpeg());
                seq = current.seq();
            }
            while (true) {
                Frame frame = awaitFrame(feed, seq);
                long now = System.currentTimeMillis();
                if (frame != null) {
                    writePart(out, frame.jpeg());
                    seq = frame.seq();
                    lastNew = now;
                    continue;
                }
                if (now - lastNew > GIVE_UP_MS) {
                    return;
                }
                // nothing new: the last frame again, which also finds out whether the viewer is still there
                Frame last = feed.frame;
                if (last != null && now - last.receivedAt() < FRAME_MAX_AGE_MS) {
                    writePart(out, last.jpeg());
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            removeViewer(feed);
        }
    }

    private Frame awaitFrame(Feed feed, long afterSeq) throws InterruptedException {
        long deadline = System.currentTimeMillis() + FRAME_WAIT_MS;
        synchronized (feed) {
            while (feed.frame == null || feed.frame.seq() <= afterSeq) {
                long left = deadline - System.currentTimeMillis();
                if (left <= 0) {
                    return null;
                }
                feed.wait(left);
            }
            return feed.frame;
        }
    }

    private static void writePart(OutputStream out, byte[] jpeg) throws IOException {
        out.write(("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + jpeg.length + "\r\n\r\n")
                .getBytes(StandardCharsets.US_ASCII));
        out.write(jpeg);
        out.write("\r\n".getBytes(StandardCharsets.US_ASCII));
        out.flush();
    }

    private void addViewer(Feed feed) {
        if (feed.viewers.incrementAndGet() == 1) {
            log.info("Camera {} is watched, asking it for frames", feed.hardwareId);
            controllerPublisher.publishStreamRequest(feed.userId, feed.hardwareId, true);
        }
    }

    private void removeViewer(Feed feed) {
        if (feed.viewers.decrementAndGet() == 0) {
            log.info("Nobody watches camera {}, stopping its frames", feed.hardwareId);
            controllerPublisher.publishStreamRequest(feed.userId, feed.hardwareId, false);
        }
    }

    /**
     * The board sends frames for 30 s after a request: repeated while somebody watches, also covering a board
     * that reconnected meanwhile.
     */
    @Scheduled(fixedRate = 10000)
    public void keepStreaming() {
        feeds.values().stream()
                .filter(feed -> feed.viewers.get() > 0)
                .forEach(feed -> controllerPublisher.publishStreamRequest(feed.userId, feed.hardwareId, true));
    }

    // --- the flame device of a new camera ---

    /**
     * An ESP32-CAM seen for the first time gets the device its detector reports to, so alerts work without
     * setting anything up. After the hello is committed; in a transaction of its own, the hello's is over.
     */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCameraBoardRegistered(CameraBoardRegistered event) {
        boolean exists = deviceRepository.findByControllerId(event.controllerId()).stream()
                .anyMatch(device -> device.getSensorModel() == SensorModel.CAMERA);
        if (exists) {
            return;
        }
        DisplayLanguage language = controllerRepository.findById(event.controllerId())
                .map(controller -> DisplayLanguage.orDefault(controller.getDisplayLanguage()))
                .orElse(DisplayLanguage.UK);
        Device device = new Device();
        device.setName(language == DisplayLanguage.EN ? "Flame in the camera" : "Полум'я в кадрі");
        device.setType(DeviceType.FLAME);
        device.setSensorModel(SensorModel.CAMERA);
        device.setControllerId(event.controllerId());
        device.setDelay(FLAME_DEVICE_DELAY_MS);
        Device created = deviceService.createDevice(device, event.userId());
        log.info("Created flame device {} for camera {}", created.getId(), event.controllerId());
    }
}
