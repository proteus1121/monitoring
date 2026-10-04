package org.proteus1121.service;

import java.util.stream.Collectors;
import java.util.Arrays;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.model.enums.DisplayModel;
import org.proteus1121.model.dto.controller.DisplaySettings;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import org.proteus1121.repository.ControllerShareRepository;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.entity.ControllerShareEntity;
import org.proteus1121.model.dto.controller.ControllerShare;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.dto.mqtt.ControllerConfiguration;
import org.proteus1121.model.dto.mqtt.ControllerHello;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.zip.CRC32;

/**
 * Keeps track of boards (ESP32 / ESP8266) and pushes the configuration of their devices over MQTT.
 * <p>
 * Flow: the board connects and sends hello with the configuration version it has applied, the server
 * registers the board for the user and (re)publishes the configuration when the version differs.
 * Any change of a device bound to a board republishes the configuration as well.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ControllerService {

    private static final Duration ONLINE_TIMEOUT = Duration.ofMinutes(3);

    private final ControllerRepository controllerRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final ControllerPublisher controllerPublisher;
    private final ObjectMapper objectMapper;
    private final ControllerShareRepository controllerShareRepository;
    private final UserDeviceService userDeviceService;
    private final MqttAccountService mqttAccountService;

    @Transactional
    public void handleHello(Long userId, String hardwareId, ControllerHello hello) {
        if (!userRepository.existsById(userId)) {
            log.warn("Controller {} announced itself for unknown user {}", hardwareId, userId);
            return;
        }

        ControllerEntity controller = controllerRepository.findByHardwareId(hardwareId).orElse(null);
        if (controller == null) {
            controller = new ControllerEntity();
            controller.setUserId(userId);
            controller.setHardwareId(hardwareId);
            controller.setName(hardwareId);
            log.info("Registering new controller {} for user {}", hardwareId, userId);
        } else {
            changeOwner(controller, userId);
        }

        controller.setPlatform(hello.platform());
        if (hello.board() != null) {
            controller.setBoard(hello.board());
        }
        controller.setFirmwareVersion(hello.fw());
        controller.setIpAddress(hello.ip());
        controller.setAppliedConfigVersion(hello.v());
        controller.setDisplayFound(hello.disp());
        controller.setLastSeen(LocalDateTime.now());
        controller = controllerRepository.save(controller);

        ControllerConfiguration configuration = buildConfiguration(controller);
        if (!Objects.equals(configuration.v(), hello.v())) {
            log.info("Controller {} has configuration {} but {} is expected, sending it", hardwareId, hello.v(), configuration.v());
            controllerPublisher.publishConfiguration(userId, hardwareId, configuration);
        }
    }

    /**
     * Boards of the user and boards shared with them (with their role).
     */
    public List<Controller> getControllers(Long userId) {
        List<Controller> result = new ArrayList<>(controllerRepository.findByUserIdOrderByIdAsc(userId).stream()
                .map(entity -> toController(entity, DeviceRole.OWNER))
                .toList());
        for (ControllerShareEntity share : controllerShareRepository.findByUserId(userId)) {
            controllerRepository.findById(share.getControllerId())
                    .ifPresent(entity -> result.add(toController(entity, share.getRole())));
        }
        return result;
    }

    /**
     * Binds a board to the user who signed in from its page (BoardConnectService).
     */
    @Transactional
    public Controller claim(Long userId, String hardwareId, String platform, String firmwareVersion) {
        ControllerEntity controller = controllerRepository.findByHardwareId(hardwareId).orElseGet(() -> {
            ControllerEntity created = new ControllerEntity();
            created.setUserId(userId);
            created.setHardwareId(hardwareId);
            created.setName(hardwareId);
            return created;
        });
        changeOwner(controller, userId);
        if (platform != null) controller.setPlatform(platform);
        if (firmwareVersion != null) controller.setFirmwareVersion(firmwareVersion);
        controller = controllerRepository.save(controller);
        // replaces a retained "unpair" left from deleting the board earlier
        publishConfiguration(controller.getId());
        log.info("Controller {} paired with user {}", hardwareId, userId);
        return toController(controller, DeviceRole.OWNER);
    }

    /**
     * A board provisioned with another account: devices and shares of the previous owner no longer apply.
     */
    private void changeOwner(ControllerEntity controller, Long userId) {
        if (controller.getId() == null || Objects.equals(controller.getUserId(), userId)) {
            controller.setUserId(userId);
            return;
        }
        log.info("Controller {} moved from user {} to user {}", controller.getHardwareId(), controller.getUserId(), userId);
        unbindDevices(controller.getId());
        controllerShareRepository.deleteByControllerId(controller.getId());
        controllerPublisher.clearConfiguration(controller.getUserId(), controller.getHardwareId());
        controller.setUserId(userId);
    }

    // --- sharing a whole board ---

    @Transactional
    public void share(Long controllerId, Long ownerId, Long userId, DeviceRole role) {
        checkController(controllerId, ownerId);
        if (Objects.equals(ownerId, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The board already belongs to this user");
        }
        if (role == DeviceRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A board can be shared as EDITOR or VIEWER");
        }
        ControllerShareEntity share = controllerShareRepository.findByControllerIdAndUserId(controllerId, userId)
                .orElseGet(() -> new ControllerShareEntity(controllerId, userId, role));
        share.setRole(role);
        controllerShareRepository.save(share);
        deviceRepository.findByControllerId(controllerId).forEach(device ->
                userDeviceService.shareDevice(device.getId(), Map.of(userId, role)));
    }

    @Transactional
    public void unshare(Long controllerId, Long ownerId, Long userId) {
        checkController(controllerId, ownerId);
        controllerShareRepository.findByControllerIdAndUserId(controllerId, userId)
                .ifPresent(controllerShareRepository::delete);
        deviceRepository.findByControllerId(controllerId).forEach(device ->
                userDeviceService.unshareDevice(device.getId(), userId));
    }

    public List<ControllerShare> getShares(Long ownerId) {
        List<ControllerEntity> owned = controllerRepository.findByUserIdOrderByIdAsc(ownerId);
        Map<Long, String> names = new HashMap<>();
        owned.forEach(c -> names.put(c.getId(), c.getName()));
        return controllerShareRepository.findByControllerIdIn(owned.stream().map(ControllerEntity::getId).toList()).stream()
                .map(share -> new ControllerShare(share.getControllerId(), names.get(share.getControllerId()),
                        share.getUserId(),
                        userRepository.findById(share.getUserId()).map(u -> u.getName()).orElse("?"),
                        share.getRole()))
                .toList();
    }

    /**
     * A device put on a shared board is shared with everyone the board is shared with.
     */
    public void applyBoardShares(Long deviceId, Long controllerId) {
        if (controllerId == null) {
            return;
        }
        controllerShareRepository.findByControllerId(controllerId).forEach(share ->
                userDeviceService.shareDevice(deviceId, Map.of(share.getUserId(), share.getRole())));
    }

    public ControllerEntity checkController(Long controllerId, Long userId) {
        ControllerEntity controller = controllerRepository.findById(controllerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Controller " + controllerId + " not found"));
        if (!Objects.equals(controller.getUserId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Controller " + controllerId + " belongs to another user");
        }
        return controller;
    }

    // --- display ---

    /**
     * Display of the board: what was configured on the site, otherwise the one the platform ships with.
     */
    public DisplaySettings displayOf(ControllerEntity controller) {
        if (controller.getDisplayModel() == null) {
            return DisplaySettings.defaultFor(controller.getPlatform());
        }
        List<Integer> pins = controller.getDisplayPins() == null || controller.getDisplayPins().isBlank()
                ? List.of()
                : Arrays.stream(controller.getDisplayPins().split(",")).map(String::trim).map(Integer::valueOf).toList();
        return new DisplaySettings(controller.getDisplayModel(), pins, Boolean.TRUE.equals(controller.getDisplayFlip()));
    }

    public DisplaySettings displayOf(Long controllerId) {
        return controllerRepository.findById(controllerId).map(this::displayOf).orElse(null);
    }

    @Transactional
    public Controller updateDisplay(Long controllerId, Long userId, DisplayModel model, List<Integer> pins, boolean flip) {
        ControllerEntity controller = checkController(controllerId, userId);
        List<Integer> displayPins = pins == null ? List.of() : pins;
        if (displayPins.size() != model.getPins().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    model.getLabel() + " needs pins " + String.join(", ", model.getPins()));
        }
        if (displayPins.stream().anyMatch(pin -> pin == null || pin < 0 || pin > 39)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select every display pin");
        }
        if (displayPins.stream().distinct().count() != displayPins.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Display pins must be different");
        }
        DisplaySettings display = new DisplaySettings(model, displayPins, flip);
        for (DeviceEntity device : deviceRepository.findByControllerId(controllerId)) {
            checkDisplayConflict(display, device.getSensorModel(), device.getPin(), device.getSecondaryPin(), device.getName());
        }
        controller.setDisplayModel(model);
        controller.setDisplayPins(displayPins.stream().map(String::valueOf).collect(Collectors.joining(",")));
        controller.setDisplayFlip(flip);
        controller = controllerRepository.save(controller);
        publishConfiguration(controllerId);
        return toController(controller);
    }

    /**
     * A device must not use display pins; a BMP180 may share the I2C bus of an I2C display.
     */
    public void checkDisplayConflict(DisplaySettings display, SensorModel model, Integer pin, Integer secondaryPin,
                                     String deviceName) {
        if (display == null || display.pins().isEmpty()) {
            return;
        }
        List<Integer> devicePins = new ArrayList<>();
        if (pin != null) devicePins.add(pin);
        if (secondaryPin != null) devicePins.add(secondaryPin);
        if (devicePins.stream().noneMatch(display.pins()::contains)) {
            return;
        }
        boolean sharedI2c = model == SensorModel.BMP180 && display.model().isI2c() && devicePins.equals(display.pins());
        if (!sharedI2c) {
            int busy = devicePins.stream().filter(display.pins()::contains).findFirst().orElseThrow();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "GPIO" + busy + " is used by both the display and " + (deviceName == null ? "a device" : deviceName));
        }
    }

    @Transactional
    public Controller rename(Long controllerId, Long userId, String name) {
        ControllerEntity controller = checkController(controllerId, userId);
        controller.setName(name);
        return toController(controllerRepository.save(controller));
    }

    @Transactional
    public void delete(Long controllerId, Long userId) {
        ControllerEntity controller = checkController(controllerId, userId);
        unbindDevices(controllerId);
        controllerShareRepository.deleteByControllerId(controllerId);
        // otherwise the board's next hello registers it again right away
        controllerPublisher.publishUnpair(controller.getUserId(), controller.getHardwareId());
        // the board can no longer connect; signing in from its page again gives it a new login
        mqttAccountService.revoke(controller.getHardwareId());
        controllerRepository.delete(controller);
    }

    /**
     * Publishes the current configuration to the board, does nothing when the id is null or unknown.
     */
    public void publishConfiguration(Long controllerId) {
        if (controllerId == null) {
            return;
        }
        // inside a transaction wait for the commit: the board answers within milliseconds and its hello must
        // see the new devices, otherwise the server sends the old configuration back and the board stays pending
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doPublishConfiguration(controllerId);
                }
            });
        } else {
            doPublishConfiguration(controllerId);
        }
    }

    private void doPublishConfiguration(Long controllerId) {
        controllerRepository.findById(controllerId).ifPresent(controller ->
                controllerPublisher.publishConfiguration(controller.getUserId(), controller.getHardwareId(),
                        buildConfiguration(controller)));
    }

    public void sendCommand(Long controllerId, Long deviceId, double value) {
        ControllerEntity controller = controllerRepository.findById(controllerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device is not bound to a controller"));
        controllerPublisher.publishCommand(controller.getUserId(), deviceId, value);
    }

    ControllerConfiguration buildConfiguration(Long controllerId) {
        return buildConfiguration(controllerId, controllerRepository.findById(controllerId)
                .map(this::displayOf)
                .orElse(DisplaySettings.defaultFor(null)));
    }

    ControllerConfiguration buildConfiguration(ControllerEntity controller) {
        return buildConfiguration(controller.getId(), displayOf(controller));
    }

    private ControllerConfiguration buildConfiguration(Long controllerId, DisplaySettings display) {
        List<ControllerConfiguration.Channel> channels = deviceRepository.findByControllerId(controllerId).stream()
                .filter(device -> device.getSensorModel() != null && device.getPin() != null && device.getType() != null)
                .sorted(Comparator.comparing(DeviceEntity::getId))
                .map(device -> new ControllerConfiguration.Channel(
                        device.getId(),
                        device.getType(),
                        device.getSensorModel(),
                        device.getPin(),
                        device.getSecondaryPin(),
                        device.getDelay()))
                .toList();
        ControllerConfiguration.Display payload =
                new ControllerConfiguration.Display(display.model(), display.pins(), display.flip());
        return new ControllerConfiguration(version(channels, payload), channels, payload);
    }

    private String version(List<ControllerConfiguration.Channel> channels, ControllerConfiguration.Display display) {
        try {
            CRC32 crc = new CRC32();
            crc.update(objectMapper.writeValueAsString(channels).getBytes(StandardCharsets.UTF_8));
            crc.update(objectMapper.writeValueAsString(display).getBytes(StandardCharsets.UTF_8));
            return "%08x".formatted(crc.getValue());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize controller configuration", e);
        }
    }

    private void unbindDevices(Long controllerId) {
        List<DeviceEntity> devices = deviceRepository.findByControllerId(controllerId);
        devices.forEach(device -> device.setControllerId(null));
        deviceRepository.saveAll(devices);
    }

    private Controller toController(ControllerEntity entity) {
        return toController(entity, DeviceRole.OWNER);
    }

    private Controller toController(ControllerEntity entity, DeviceRole role) {
        Controller controller = new Controller();
        controller.setRole(role);
        controller.setId(entity.getId());
        controller.setUserId(entity.getUserId());
        controller.setHardwareId(entity.getHardwareId());
        controller.setName(entity.getName());
        controller.setPlatform(entity.getPlatform());
        controller.setBoard(entity.getBoard());
        controller.setFirmwareVersion(entity.getFirmwareVersion());
        controller.setIpAddress(entity.getIpAddress());
        controller.setLastSeen(entity.getLastSeen());
        controller.setOnline(entity.getLastSeen() != null
                && entity.getLastSeen().isAfter(LocalDateTime.now().minus(ONLINE_TIMEOUT)));
        ControllerConfiguration configuration = buildConfiguration(entity);
        controller.setDisplay(displayOf(entity));
        controller.setDisplayFound(entity.getDisplayFound());
        controller.setSynced(Objects.equals(configuration.v(), entity.getAppliedConfigVersion()));
        controller.setDeviceCount(configuration.devices().size());
        return controller;
    }
}
