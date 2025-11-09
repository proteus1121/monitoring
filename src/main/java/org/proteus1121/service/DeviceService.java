package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@Service
@RequiredArgsConstructor
public class DeviceService {
    
    private final DeviceMapper deviceMapper;
    private final DeviceRepository deviceRepository;
    private final ConfigurationPublisher configurationPublisher;

    public Optional<Device> getDeviceById(Long id) {
        Optional<DeviceEntity> deviceEntity = deviceRepository.findById(id);
        return deviceEntity.map(deviceMapper::toDevice);
    }
    
    public Device createDevice(Device device, Long userId) {
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device, userId));
        Device createdDevice = deviceMapper.toDevice(deviceEntity);
        configurationPublisher.publish(createdDevice.getUserId(), deviceEntity.getId(), 
                deviceMapper.toDeviceConfiguration(createdDevice));
        
        return createdDevice;
    }
    
    public Device updateDevice(Long id, Device device) {
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(id, device));
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
        Optional<Device> deviceOpt = getDeviceById(id);
        if (deviceOpt.isEmpty()) {
            throw new RuntimeException("Device " + id + " not found");
        }
        Device device = deviceOpt.get();
        if (!Objects.equals(device.getUserId(), getCurrentUser().getId())) {
            //TODO: exception handling
            throw new RuntimeException("Device " + id + " belong to another user");
        }

        return device;
    }
}
