package org.proteus1121.repository;

import jakarta.transaction.Transactional;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserDeviceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDeviceEntity, UserDeviceId> {
    
    List<UserDeviceEntity> findByDeviceId(Long deviceId);

    Optional<UserDeviceEntity> findByUserIdAndDeviceId(Long userId, Long deviceId);

    @Transactional
    @Modifying
    @Query("DELETE FROM UserDeviceEntity ud WHERE ud.userId = :userId AND ud.deviceId = :deviceId")
    void deleteByUserIdAndDeviceId(Long userId, Long deviceId);
}
