package org.proteus1121.repository;

import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserDeviceId;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserDeviceRepository extends JpaRepository<UserDeviceEntity, UserDeviceId> {
    List<UserDeviceEntity> findByUserId(Long userId);
    List<UserDeviceEntity> findByDeviceId(Long deviceId);
    Optional<UserDeviceEntity> findByUserIdAndDeviceId(Long userId, Long deviceId);

    @Query("select ud from UserDeviceEntity ud where ud.userId = :userId and ud.role = :role")
    List<UserDeviceEntity> findByUserIdAndRole(Long userId, DeviceRole role);

    Set<UserDeviceEntity> findAllByUserIdIn(Set<Long> ids);
}
