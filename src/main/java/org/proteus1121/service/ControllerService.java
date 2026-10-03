package org.proteus1121.service;

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
        } else if (!Objects.equals(controller.getUserId(), userId)) {
            // the board was provisioned with another account: devices of the previous owner are no longer wired to it
            log.info("Controller {} moved from user {} to user {}", hardwareId, controller.getUserId(), userId);
            unbindDevices(controller.getId());
            controllerPublisher.clearConfiguration(controller.getUserId(), hardwareId);
            controller.setUserId(userId);
        }

        controller.setPlatform(hello.platform());
        controller.setFirmwareVersion(hello.fw());
        controller.setIpAddress(hello.ip());
        controller.setAppliedConfigVersion(hello.v());
        controller.setLastSeen(LocalDateTime.now());
        controller = controllerRepository.save(controller);

        ControllerConfiguration configuration = buildConfiguration(controller.getId());
        if (!Objects.equals(configuration.v(), hello.v())) {
            log.info("Controller {} has configuration {} but {} is expected, sending it", hardwareId, hello.v(), configuration.v());
            controllerPublisher.publishConfiguration(userId, hardwareId, configuration);
        }
    }

    public List<Controller> getControllers(Long userId) {
        return controllerRepository.findByUserIdOrderByIdAsc(userId).stream()
                .map(this::toController)
                .toList();
    }

    public ControllerEntity checkController(Long controllerId, Long userId) {
        ControllerEntity controller = controllerRepository.findById(controllerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Controller " + controllerId + " not found"));
        if (!Objects.equals(controller.getUserId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Controller " + controllerId + " belongs to another user");
        }
        return controller;
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
        controllerPublisher.clearConfiguration(controller.getUserId(), controller.getHardwareId());
        controllerRepository.delete(controller);
    }

    /**
     * Publishes the current configuration to the board, does nothing when the id is null or unknown.
     */
    public void publishConfiguration(Long controllerId) {
        if (controllerId == null) {
            return;
        }
        controllerRepository.findById(controllerId).ifPresent(controller ->
                controllerPublisher.publishConfiguration(controller.getUserId(), controller.getHardwareId(),
                        buildConfiguration(controllerId)));
    }

    public void sendCommand(Long controllerId, Long deviceId, double value) {
        ControllerEntity controller = controllerRepository.findById(controllerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device is not bound to a controller"));
        controllerPublisher.publishCommand(controller.getUserId(), deviceId, value);
    }

    ControllerConfiguration buildConfiguration(Long controllerId) {
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
        return new ControllerConfiguration(version(channels), channels);
    }

    private String version(List<ControllerConfiguration.Channel> channels) {
        try {
            CRC32 crc = new CRC32();
            crc.update(objectMapper.writeValueAsString(channels).getBytes(StandardCharsets.UTF_8));
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
        Controller controller = new Controller();
        controller.setId(entity.getId());
        controller.setUserId(entity.getUserId());
        controller.setHardwareId(entity.getHardwareId());
        controller.setName(entity.getName());
        controller.setPlatform(entity.getPlatform());
        controller.setFirmwareVersion(entity.getFirmwareVersion());
        controller.setIpAddress(entity.getIpAddress());
        controller.setLastSeen(entity.getLastSeen());
        controller.setOnline(entity.getLastSeen() != null
                && entity.getLastSeen().isAfter(LocalDateTime.now().minus(ONLINE_TIMEOUT)));
        ControllerConfiguration configuration = buildConfiguration(entity.getId());
        controller.setSynced(Objects.equals(configuration.v(), entity.getAppliedConfigVersion()));
        controller.setDeviceCount(configuration.devices().size());
        return controller;
    }
}
