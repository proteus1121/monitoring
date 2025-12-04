package org.proteus1121.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.UserDevices;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

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
        Set<UserDevices> userDevices = userDeviceService.shareDevice(deviceEntity.getId(), Map.of(ownerId, DeviceRole.OWNER));

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
                configurationPublisher.publish(user.getId(), id, deviceMapper.toDeviceConfiguration(updatedDevice)));

        return updatedDevice;
    }

    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }

    public List<Device> getAllDevices(Long userId) {
        return deviceRepository.findDevicesByUserId(userId).stream()
                .map(deviceMapper::toDevice)
                .toList();
    }

    public Device checkDevice(Long id, DeviceRole requiredRole) {
        Optional<Device> deviceOpt = getDeviceById(id);
        if (deviceOpt.isEmpty()) {
            throw new RuntimeException("Device " + id + " not found");
        }
        Device device = deviceOpt.get();

        Long currentUserId = getCurrentUser().getId();
        boolean hasAccess = device.getUserDevices().stream()
                .anyMatch(ud -> Objects.equals(ud.getId(), currentUserId)
                        && ud.getRole().getPriority() >= requiredRole.getPriority());

        if (!hasAccess) {
            throw new RuntimeException("User does not have required role " + requiredRole + " for device " + id);
        }

        return device;
    }

    public Set<User> getUsersByDeviceId(Long deviceId) {
        return userDeviceService.getUsers(deviceId);
    }
}
