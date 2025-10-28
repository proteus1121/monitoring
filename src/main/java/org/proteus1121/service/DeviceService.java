package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@Service
@RequiredArgsConstructor
public class DeviceService {
    
    private final DeviceMapper deviceMapper;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final ConfigurationPublisher configurationPublisher;
    
    public Device getDeviceById(Long id) {
        DeviceEntity deviceEntity = deviceRepository.getReferenceById(id);
        return deviceMapper.toDevice(deviceEntity);
    }
    
    public Device createDevice(Device device, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with ID " + device.getUserId() + " not found"));

        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device, user.getId()));
        Device createdDevice = deviceMapper.toDevice(deviceEntity);
        configurationPublisher.publish(createdDevice.getUserId(), deviceEntity.getId(), 
                deviceMapper.toDeviceConfiguration(createdDevice));
        
        return createdDevice;
    }
    
    public Device updateDevice(Long id, Device device, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with ID " + device.getUserId() + " not found"));
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(id, device, user.getId()));
        Device updatedDevice = deviceMapper.toDevice(deviceEntity);
        configurationPublisher.publish(updatedDevice.getUserId(), deviceEntity.getId(),
                deviceMapper.toDeviceConfiguration(updatedDevice));
        return updatedDevice;
    }
    
    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }

    public List<Device> getAllDevices(Long userId) {
        return deviceRepository.findAllByUserId(userId).stream()
                .map(deviceMapper::toDevice)
                .toList();
    }

    public Device checkDevice(Long id) {
        Device device = getDeviceById(id);
        if (!Objects.equals(device.getUserId(), getCurrentUser().getId())) {
            //TODO: exception handling
            throw new RuntimeException("Device " + id + " belong to another user");
        }

        return device;
    }
}
