package org.proteus1121.service;

import org.proteus1121.service.llm.DeviceDescriptionService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceMapper deviceMapper;
    private final UserDeviceService userDeviceService;
    private final ControllerService controllerService;
    private final DeviceDescriptionService deviceDescriptionService;
    private final JdbcTemplate jdbcTemplate;

    public Optional<Device> getDeviceById(Long id) {
        Optional<DeviceEntity> deviceEntity = deviceRepository.findByIdWithUsers(id);
        return deviceEntity.map(deviceMapper::toDevice);
    }

    public Device createDevice(Device device, Long ownerId) {
        validateBinding(device, ownerId, null);
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device));
        Set<DeviceUser> userDevices = userDeviceService.shareDevice(deviceEntity.getId(), Map.of(ownerId, DeviceRole.OWNER));
        Device createdDevice = deviceMapper.toDevice(deviceEntity, userDevices);
        controllerService.publishConfiguration(deviceEntity.getControllerId());
        controllerService.applyBoardShares(deviceEntity.getId(), deviceEntity.getControllerId());
        deviceDescriptionService.fillMissingAsync(deviceEntity.getId());
        return createdDevice;
    }

    @Transactional
    public Device updateDevice(Long id, Device device) {
        DeviceEntity deviceEntity = deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Device " + id + " not found")); // TODO: custom exception
        Long previousControllerId = deviceEntity.getControllerId();
        validateBinding(device, getCurrentUser().getId(), previousControllerId);
        deviceMapper.toDevice(device, deviceEntity);
        // hardware binding is replaced as a whole so a device can be detached from its controller
        deviceEntity.setControllerId(device.getControllerId());
        deviceEntity.setSensorModel(device.getSensorModel());
        deviceEntity.setPin(device.getPin());
        deviceEntity.setSecondaryPin(device.getSecondaryPin());
        deviceEntity = deviceRepository.save(deviceEntity);
        Device updatedDevice = deviceMapper.toDevice(deviceEntity);
        controllerService.publishConfiguration(deviceEntity.getControllerId());
        if (!Objects.equals(previousControllerId, deviceEntity.getControllerId())) {
            controllerService.publishConfiguration(previousControllerId);
            controllerService.applyBoardShares(id, deviceEntity.getControllerId());
        }
        return updatedDevice;
    }

    /**
     * Deletes the device with its readings, forecasts and incident links: they reference the device by a
     * foreign key, so deleting the row alone fails as soon as the device has sent anything.
     */
    @Transactional
    public void deleteDevice(Long id) {
        Long controllerId = deviceRepository.findById(id).map(DeviceEntity::getControllerId).orElse(null);
        jdbcTemplate.update("DELETE FROM incident_devices WHERE dev_id = ?", id);
        jdbcTemplate.update("DELETE FROM incidents WHERE NOT EXISTS (SELECT 1 FROM incident_devices d WHERE d.inc_id = incidents.id)");
        jdbcTemplate.update("DELETE FROM predicted_sensor_data WHERE device_id = ?", id);
        jdbcTemplate.update("DELETE FROM sensor_data WHERE device_id = ?", id);
        deviceRepository.deleteById(id);
        controllerService.publishConfiguration(controllerId);
    }

    /**
     * Sends a value (e.g. relay on/off) to a device bound to a controller.
     */
    public void sendCommand(Long id, double value) {
        DeviceEntity deviceEntity = deviceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device " + id + " not found"));
        if (deviceEntity.getControllerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device " + id + " is not bound to a controller");
        }
        if (deviceEntity.getSensorModel() == null || !deviceEntity.getSensorModel().isOutput()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device " + id + " does not accept commands");
        }
        controllerService.sendCommand(deviceEntity.getControllerId(), id, value);
    }

    /**
     * true when the device is owned by or shared with the user, used to reject measurements published to foreign topics.
     */
    public boolean isAccessibleBy(Long deviceId, Long userId) {
        return getUsersByDeviceId(deviceId).stream().anyMatch(user -> Objects.equals(user.getUserId(), userId));
    }

    private void validateBinding(Device device, Long userId, Long currentControllerId) {
        if (device.getControllerId() == null) {
            return;
        }
        // keeping an existing binding is allowed for editors of a shared device, changing it requires owning the board
        if (!Objects.equals(device.getControllerId(), currentControllerId)) {
            controllerService.checkController(device.getControllerId(), userId);
        }
        SensorModel model = device.getSensorModel();
        if (model == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sensor model is required for a device bound to a controller");
        }
        if (device.getType() == null || device.getType() == DeviceType.UNKNOWN) {
            device.setType(model.getSupportedTypes().get(0));
        }
        if (!model.supports(device.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    model + " cannot measure " + device.getType() + ", supported: " + model.getSupportedTypes());
        }
        if (device.getPin() == null || device.getPin() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pin is required for " + model);
        }
        if (model.getPins().size() > 1 && (device.getSecondaryPin() == null || device.getSecondaryPin() < 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, model + " needs pin " + model.getPins().get(1));
        }
        if (model.getPins().size() == 1) {
            device.setSecondaryPin(null);
        }
        controllerService.checkDisplayConflict(controllerService.displayOf(device.getControllerId()), model,
                device.getPin(), device.getSecondaryPin(), device.getName());
    }

    public List<Device> getAllDevices(Long userId) {
        return deviceRepository.findDevicesByUserId(userId).stream()
                .map(deviceEntity -> deviceMapper.toDeviceWithUsers(deviceEntity, userDeviceService.getUserDeviceMapper()))
                .toList();
    }

    public Device checkDevice(Long id, DeviceRole requiredRole) {
        return checkDevice(id, requiredRole, false);
    }

    public Device checkDevice(Long id, DeviceRole requiredRole, boolean bypass) {
        Optional<Device> deviceOpt = getDeviceById(id);
        if (deviceOpt.isEmpty()) {
            throw new RuntimeException("Device " + id + " not found");
        }
        Device device = deviceOpt.get();
        
        if (bypass) {
            return device;
        }
        Long currentUserId = getCurrentUser().getId();
        boolean hasAccess = device.getUserDevices().stream()
                .anyMatch(ud -> Objects.equals(ud.getUserId(), currentUserId)
                        && ud.getRole().getPriority() >= requiredRole.getPriority());
        if (!hasAccess) {
            throw new RuntimeException("User does not have required role " + requiredRole + " for device " + id);
        }
        return device;
    }

    public Set<DeviceUser> getUsersByDeviceId(Long deviceId) {
        return userDeviceService.getUsers(deviceId);
    }

    /**
     * Update device status and lastChecked timestamp
     */
    @Transactional
    public void updateDeviceStatus(Long deviceId, DeviceStatus status) {
        DeviceEntity deviceEntity = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device " + deviceId + " not found"));
        
        if (deviceEntity.getStatus() != status) {
            log.info("Updating device {} status from {} to {}", deviceId, deviceEntity.getStatus(), status);
            deviceEntity.setStatus(status);
        }
        deviceEntity.setLastChecked(LocalDateTime.now());
        deviceRepository.save(deviceEntity);
    }

    /**
     * Check all devices and mark as OFFLINE if no data received within their delay threshold
     */
    @Transactional
    public void checkOfflineDevices() {
        List<DeviceEntity> allDevices = deviceRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        
        for (DeviceEntity device : allDevices) {
            // Skip devices that are already offline or have no delay configured
            if (device.getDelay() == null || device.getDelay() <= 0) {
                continue;
            }
            
            LocalDateTime lastChecked = device.getLastChecked();
            if (lastChecked != null) {
                long millisSinceLastCheck = java.time.Duration.between(lastChecked, now).toMillis();
                
                // Allow a few missed sends: the check itself runs once a minute
                long offlineThreshold = Math.max(device.getDelay() * 3, 90_000L);
                if (millisSinceLastCheck > offlineThreshold) {
                    if (device.getStatus() != DeviceStatus.OFFLINE) {
                        log.warn("Device {} ({}) is now OFFLINE. Last checked: {}, delay: {}ms, time elapsed: {}ms",
                                device.getId(), device.getName(), lastChecked, device.getDelay(), millisSinceLastCheck);
                        device.setStatus(DeviceStatus.OFFLINE);
                        deviceRepository.save(device);
                    }
                }
            }
        }
    }
}
