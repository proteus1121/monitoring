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

    /**
     * Device type and value of every reading in the window, newest first; a projection so devices are not loaded per row.
     */
    @Query("SELECT d.type, s.value FROM SensorDataEntity s JOIN s.device d WHERE s.timestamp BETWEEN :startTimestamp AND :endTimestamp ORDER BY s.timestamp DESC")
    List<Object[]> findTypeAndValueInWindow(
            @Param("startTimestamp") LocalDateTime startTimestamp,
            @Param("endTimestamp") LocalDateTime endTimestamp
    );

    /**
     * Hourly averages since {@code from}: [hour as 'yyyy-MM-dd HH:00:00', average], oldest first.
     * Aggregated in the database so forecasting never loads the raw readings.
     */
    @Query(value = "SELECT DATE_FORMAT(s.timestamp, '%Y-%m-%d %H:00:00') AS hour, AVG(s.value) AS value " +
            "FROM sensor_data s WHERE s.device_id = :deviceId AND s.timestamp >= :from AND s.value IS NOT NULL " +
            "GROUP BY hour ORDER BY hour", nativeQuery = true)
    List<Object[]> findHourlyAverages(@Param("deviceId") Long deviceId, @Param("from") LocalDateTime from);

    @Query("SELECT COUNT(s) FROM SensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp >= :timestamp")
    long countByDeviceIdAndTimestampAfter(
            @Param("deviceId") Long deviceId,
            @Param("timestamp") LocalDateTime timestamp
    );

    @Query("SELECT s FROM SensorDataEntity s WHERE s.device.id = :deviceId ORDER BY s.timestamp DESC LIMIT 1")
    SensorDataEntity findLatestByDeviceId(@Param("deviceId") Long deviceId);
}