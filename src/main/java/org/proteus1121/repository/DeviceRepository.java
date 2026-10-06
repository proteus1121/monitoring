package org.proteus1121.repository;

import org.proteus1121.model.entity.DeviceEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<DeviceEntity, Long> {

    // LOAD, not the default FETCH: a fetch graph turns every attribute it does not list lazy, and the eager
    // forecast collections then fail to load outside a session (MQTT consumer, schedulers)
    @EntityGraph(attributePaths = { "userDevices", "userDevices.user" }, type = EntityGraph.EntityGraphType.LOAD)
    @Query("SELECT DISTINCT d FROM DeviceEntity d JOIN d.userDevices ud WHERE ud.userId = :userId")
    List<DeviceEntity> findDevicesByUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = { "userDevices", "userDevices.user" }, type = EntityGraph.EntityGraphType.LOAD)
    @Query("SELECT d FROM DeviceEntity d JOIN d.userDevices ud WHERE d.id = :id")
    Optional<DeviceEntity> findByIdWithUsers(@Param("id") Long id);

    List<DeviceEntity> findByControllerId(Long controllerId);


}