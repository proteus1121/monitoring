package org.proteus1121.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.mapper.UserDeviceMapper;
import org.proteus1121.model.mapper.UserMapper;
import org.proteus1121.repository.UserDeviceRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserDeviceService {

    private final UserDeviceMapper userDeviceMapper;
    private final UserMapper userMapper;
    private final UserDeviceRepository userDeviceRepository;
    private final EntityManager entityManager;

    @Transactional
    public Set<DeviceUser> shareDevice(Long deviceId, Map<Long, DeviceRole> users) {

        return users.entrySet().stream()
                .map(entry -> userDeviceRepository.findByUserIdAndDeviceId(entry.getKey(), deviceId)
                        .map(deviceEntity -> {
                            if (deviceEntity.getRole() == entry.getValue()) {
                                return deviceEntity;
                            }
                            deviceEntity.setRole(entry.getValue());
                            return userDeviceRepository.saveAndFlush(deviceEntity);
                        })
                        .orElseGet(() -> userDeviceRepository.saveAndFlush(userDeviceMapper.toLinkByIds(entry.getKey(), deviceId, entry.getValue())))
                )
                // TODO: remove refresh after fixing N+1 problem with UserDeviceEntity->UserEntity mapping
                .peek(entityManager::refresh)
                .map(userDeviceMapper::toDeviceUser)
                .collect(Collectors.toSet());
    }

    public void unshareDevice(Long deviceId, Long userId) {
        userDeviceRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    }

    public Set<DeviceUser> getUsers(Long deviceId) {
        return userDeviceRepository.findByDeviceId(deviceId).stream()
                .map(userDeviceMapper::toDeviceUser)
                .collect(Collectors.toSet());
    }

    public UserDeviceMapper getUserDeviceMapper() {
        return userDeviceMapper;
    }
}
