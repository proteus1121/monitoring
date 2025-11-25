package org.proteus1121.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.mapper.UserDeviceMapper;
import org.proteus1121.model.mapper.UserMapper;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserDeviceRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceMapper deviceMapper;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final ConfigurationPublisher configurationPublisher;
    private final UserDeviceRepository userDeviceRepository;
    private final UserDeviceMapper userDeviceMapper;
    private final UserMapper userMapper;

    public Optional<Device> getDeviceById(Long id) {
        Optional<DeviceEntity> deviceEntity = deviceRepository.findByIdWithUsers(id);
        return deviceEntity.map(deviceMapper::toDevice);
    }

    @Transactional
    public Device createDevice(Device device, Long ownerId) {
        UserEntity owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User " + ownerId + " not found"));

        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device));
        userDeviceRepository.save(userDeviceMapper.toLink(owner, deviceEntity, DeviceRole.OWNER));

        Device createdDevice = deviceMapper.toDevice(deviceEntity);
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

    public Device checkDevice(Long id) {
        Optional<Device> deviceOpt = getDeviceById(id);
        if (deviceOpt.isEmpty()) {
            throw new RuntimeException("Device " + id + " not found");
        }
        Device device = deviceOpt.get();

        if (getUsersByDeviceId(id).stream()
                .noneMatch(u -> Objects.equals(u.getId(), getCurrentUser().getId()))) {
            //TODO: exception handling
            throw new RuntimeException("Device " + id + " belong to another user");
        }

        return device;
    }

    public Set<UserEntity> getUserEntitiesByDeviceId(Long deviceId) {
        return new HashSet<>(userDeviceRepository.findByDeviceId(deviceId)).stream()
                .map(UserDeviceEntity::getUser)
                .collect(Collectors.toSet());
    }
    
    public Set<User> getUsersByDeviceId(Long deviceId) {
        return getUserEntitiesByDeviceId(deviceId).stream()
                .map(userMapper::toPlainUser)
                .collect(Collectors.toSet());
    }
}
