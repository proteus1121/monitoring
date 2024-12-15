package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeviceService {
    
    private final DeviceMapper deviceMapper;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    
    public Device getDeviceById(Long id) {
        DeviceEntity deviceEntity = deviceRepository.getReferenceById(id);
        return deviceMapper.toDevice(deviceEntity);
    }
    
    public Device createDevice(Device device, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with ID " + device.getUserId() + " not found"));

        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(device, user.getId()));
        return deviceMapper.toDevice(deviceEntity);
    }
    
    public Device updateDevice(Long id, Device device) {
        DeviceEntity deviceEntity = deviceRepository.save(deviceMapper.toDeviceEntity(id, device));
        return deviceMapper.toDevice(deviceEntity);
    }
    
    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }

    public List<Device> getAllDevices(Long userId) {
        return deviceRepository.findAllByUserId(userId).stream()
                .map(deviceMapper::toDevice)
                .toList();
    }
}
