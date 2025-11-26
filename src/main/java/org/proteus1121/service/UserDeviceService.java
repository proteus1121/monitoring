package org.proteus1121.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.UserDevices;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.mapper.UserDeviceMapper;
import org.proteus1121.model.mapper.UserMapper;
import org.proteus1121.repository.UserDeviceRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserDeviceService {

    private final UserDeviceMapper userDeviceMapper;
    private final UserMapper userMapper;
    private final UserDeviceRepository userDeviceRepository;
    
    public Set<UserDevices> shareDevice(Long deviceId, Map<Long, DeviceRole> users) {

        return users.entrySet().stream().map(e -> {
                    Optional<UserDeviceEntity> existingLink = userDeviceRepository.findByUserIdAndDeviceId(e.getKey(), deviceId);
                    return existingLink.orElseGet(() -> userDeviceRepository.save(userDeviceMapper.toLinkByIds(e.getKey(), deviceId, e.getValue())));
                })
                .map(userDeviceMapper::toDeviceUser)
                .collect(Collectors.toSet());
    }
    
    public void unshareDevice(Long deviceId, Long userId) {
        userDeviceRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    }

    @Transactional
    public Set<User> getUsers(Long deviceId) {
        return userDeviceRepository.findByDeviceId(deviceId).stream()
                .map(UserDeviceEntity::getUser)
                .map(userMapper::toPlainUser)
                .collect(Collectors.toSet());
    }
}
