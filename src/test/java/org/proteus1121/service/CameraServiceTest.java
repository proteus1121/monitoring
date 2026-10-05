package org.proteus1121.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.camera.CameraVision;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CameraServiceTest {

    private ControllerService controllerService;
    private ControllerPublisher controllerPublisher;
    private ControllerRepository controllerRepository;
    private DeviceRepository deviceRepository;
    private CameraService cameraService;

    @BeforeEach
    void setUp() {
        controllerService = mock(ControllerService.class);
        controllerPublisher = mock(ControllerPublisher.class);
        controllerRepository = mock(ControllerRepository.class);
        deviceRepository = mock(DeviceRepository.class);
        cameraService = new CameraService(controllerService, controllerRepository,
                deviceRepository, mock(DeviceService.class), controllerPublisher, new ObjectMapper());
        when(controllerService.getControllers(1L)).thenReturn(List.of(
                controller(5L, 1L, "esp32-cam1", "esp32cam"),
                controller(6L, 1L, "esp32-dev", "esp32dev")));
    }

    @Test
    void visionIsParsedAndKeptPerCamera() {
        cameraService.handleVision(1L, "esp32-cam1", "{\"a\":1,\"r\":0.0123,\"var\":2.5e-5,\"c\":3,\"n\":3,"
                + "\"w\":320,\"h\":240,\"fps\":8.9,\"cfps\":19.7,\"m\":[120,90,60],\"b\":[10,20,30,40]}");

        CameraVision vision = cameraService.vision(5L, 1L);
        assertTrue(vision.alarm());
        assertEquals(0.0123, vision.ratio(), 1e-9);
        assertEquals(3, vision.consec());
        assertEquals(List.of(10, 20, 30, 40), vision.box());
        assertEquals(320, vision.width());
        assertEquals(List.of(120, 90, 60), vision.mean());
    }

    @Test
    void frameOfAnotherAccountIsNotShown() {
        // the broker lets user 2's board publish only under users/2/
        cameraService.handleFrame(2L, "esp32-cam1", new byte[]{1, 2, 3});

        assertNull(cameraService.latestFrame(5L, 1L));
    }

    @Test
    void onlyCamerasTheUserSeesCanBeWatched() {
        assertThrows(ResponseStatusException.class, () -> cameraService.viewable(6L, 1L));
        assertThrows(ResponseStatusException.class, () -> cameraService.viewable(7L, 1L));
    }

    @Test
    void framesAreRelayedAsMjpegWhileSomebodyWatches() throws Exception {
        Controller camera = cameraService.viewable(5L, 1L);
        ByteArrayOutputStream received = new ByteArrayOutputStream();
        // the viewer leaves after the first frame: the next write fails
        OutputStream viewer = new OutputStream() {
            @Override
            public void write(int b) throws IOException {
                if (received.toString(StandardCharsets.ISO_8859_1).contains("\r\n--frame")) {
                    throw new IOException("closed");
                }
                received.write(b);
            }
        };
        CompletableFuture<Void> stream = CompletableFuture.runAsync(() -> {
            try {
                cameraService.stream(camera, viewer);
            } catch (IOException e) {
                // the viewer went away
            }
        });

        verify(controllerPublisher, timeout(2000)).publishStreamRequest(1L, "esp32-cam1", true);
        cameraService.handleVision(1L, "esp32-cam1", "{\"a\":0,\"r\":0.001,\"w\":320,\"h\":240}");
        cameraService.handleFrame(1L, "esp32-cam1", new byte[]{(byte) 0xFF, (byte) 0xD8, 7, (byte) 0xFF, (byte) 0xD9});
        cameraService.handleFrame(1L, "esp32-cam1", new byte[]{(byte) 0xFF, (byte) 0xD8, 8, (byte) 0xFF, (byte) 0xD9});
        stream.get(10, TimeUnit.SECONDS);

        String part = received.toString(StandardCharsets.ISO_8859_1);
        assertTrue(part.startsWith("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 5\r\n\r\n"), part);
        verify(controllerPublisher, timeout(2000)).publishStreamRequest(1L, "esp32-cam1", false);
        CameraService.Frame latest = cameraService.latestFrame(5L, 1L);
        assertArrayEquals(new byte[]{(byte) 0xFF, (byte) 0xD8, 8, (byte) 0xFF, (byte) 0xD9}, latest.jpeg());
        // the result the board sent before the frame travels with it
        assertEquals(0.001, latest.vision().ratio(), 1e-9);
    }

    @Test
    void alarmFrameIsGivenToTheNotificationsOfTheCamerasFlameDevice() throws Exception {
        DeviceEntity flame = new DeviceEntity();
        flame.setId(14L);
        flame.setSensorModel(SensorModel.CAMERA);
        flame.setControllerId(5L);
        when(deviceRepository.findById(14L)).thenReturn(Optional.of(flame));
        ControllerEntity board = new ControllerEntity();
        board.setId(5L);
        board.setUserId(1L);
        board.setHardwareId("esp32-cam1");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(board));

        // the alert is quicker than the frame: it waits for it
        CompletableFuture<byte[]> image = CompletableFuture.supplyAsync(() -> {
            try {
                return cameraService.alarmImage(14L, 3000);
            } catch (InterruptedException e) {
                throw new IllegalStateException(e);
            }
        });
        Thread.sleep(200);
        // a stream frame is not the alarm's
        cameraService.handleFrame(1L, "esp32-cam1", new byte[]{1});
        cameraService.handleVision(1L, "esp32-cam1", "{\"a\":1,\"r\":0.02,\"w\":320,\"h\":240}");
        cameraService.handleAlarmFrame(1L, "esp32-cam1", new byte[]{9, 9});

        // no box in the vision: the frame as it is
        assertArrayEquals(new byte[]{9, 9}, image.get(5, TimeUnit.SECONDS));
    }

    @Test
    void noImageForOtherDevicesOrWithoutAFrame() throws Exception {
        DeviceEntity ir = new DeviceEntity();
        ir.setId(15L);
        ir.setSensorModel(SensorModel.FLAME_IR);
        ir.setControllerId(6L);
        when(deviceRepository.findById(15L)).thenReturn(Optional.of(ir));

        assertNull(cameraService.alarmImage(15L, 100));
        assertNull(cameraService.alarmImage(99L, 100));
    }

    private Controller controller(Long id, Long userId, String hardwareId, String board) {
        Controller controller = new Controller();
        controller.setId(id);
        controller.setUserId(userId);
        controller.setHardwareId(hardwareId);
        controller.setBoard(board);
        controller.setRole(DeviceRole.OWNER);
        return controller;
    }
}
