package org.proteus1121.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.stereotype.Service;

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
    private final ConfigurationPublisher configurationPublisher;

    public Optional<Device> getDeviceById(Long id) {
        Optional<DeviceEntity> deviceEntity = deviceRepository.findByIdWithUsers(id);
        return deviceEntity.map(deviceMapper::toDevice);
    }

    public Device createDevice(Device device, Long ownerId) {
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device));
        Set<DeviceUser> userDevices = userDeviceService.shareDevice(deviceEntity.getId(), Map.of(ownerId, DeviceRole.OWNER));
        Device createdDevice = deviceMapper.toDevice(deviceEntity, userDevices);
        configurationPublisher.publish(ownerId, deviceEntity.getId(),
                deviceMapper.toDeviceConfiguration(createdDevice));
        return createdDevice;
    }

    @Transactional
    public Device updateDevice(Long id, Device device) {
        DeviceEntity deviceEntity = deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Device " + id + " not found")); // TODO: custom exception
        deviceMapper.toDevice(device, deviceEntity);
        deviceEntity = deviceRepository.save(deviceEntity);
        Device updatedDevice = deviceMapper.toDevice(deviceEntity);
        getUsersByDeviceId(id).forEach(user ->
                configurationPublisher.publish(user.getUserId(), id, deviceMapper.toDeviceConfiguration(updatedDevice)));
        return updatedDevice;
    }

    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
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
                
                // If time since last check exceeds delay threshold, mark as offline
                if (millisSinceLastCheck > device.getDelay()) {
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
