package org.proteus1121.repository;

import org.proteus1121.model.entity.DeviceEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<DeviceEntity, Long> {

    @EntityGraph(attributePaths = { "userDevices", "userDevices.user" })
    @Query("SELECT DISTINCT d FROM DeviceEntity d JOIN d.userDevices ud WHERE ud.userId = :userId")
    List<DeviceEntity> findDevicesByUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = { "userDevices", "userDevices.user" })
    @Query("SELECT d FROM DeviceEntity d WHERE d.id = :id")
    Optional<DeviceEntity> findByIdWithUsers(@Param("id") Long id);


}