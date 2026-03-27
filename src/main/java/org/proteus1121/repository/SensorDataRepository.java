package org.proteus1121.repository;

import org.proteus1121.model.entity.SensorDataEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SensorDataRepository extends JpaRepository<SensorDataEntity, Long> {

    @Query("SELECT s FROM SensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp BETWEEN :startTimestamp AND :endTimestamp")
    List<SensorDataEntity> findByDeviceIdAndTimestampRange(
            @Param("deviceId") Long deviceId,
            @Param("startTimestamp") LocalDateTime startTimestamp,
            @Param("endTimestamp") LocalDateTime endTimestamp
    );

    @Query("SELECT s FROM SensorDataEntity s WHERE LOWER(s.device.type) = :deviceType AND s.timestamp BETWEEN :startTimestamp AND :endTimestamp ORDER BY s.timestamp DESC")
    List<SensorDataEntity> findLatestByDeviceTypeInWindow(
            @Param("deviceType") String deviceType,
            @Param("startTimestamp") LocalDateTime startTimestamp,
            @Param("endTimestamp") LocalDateTime endTimestamp
    );

    @Query("SELECT COUNT(s) FROM SensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp >= :timestamp")
    long countByDeviceIdAndTimestampAfter(
            @Param("deviceId") Long deviceId,
            @Param("timestamp") LocalDateTime timestamp
    );
}