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
     * The first reading of every {@code stepSeconds} bucket counted from {@code alignedStart}: [timestamp, value],
     * oldest first. Thinned out in the database, so a month of readings is never loaded row by row.
     */
    @Query(value = "SELECT s.timestamp, s.value FROM sensor_data s JOIN (" +
            "SELECT MIN(r.id) AS id FROM sensor_data r " +
            "WHERE r.device_id = :deviceId AND r.timestamp BETWEEN :startTimestamp AND :endTimestamp " +
            "GROUP BY FLOOR(TIMESTAMPDIFF(SECOND, :alignedStart, r.timestamp) / :stepSeconds)) f ON f.id = s.id " +
            "ORDER BY s.timestamp", nativeQuery = true)
    List<Object[]> findFirstPerBucket(
            @Param("deviceId") Long deviceId,
            @Param("startTimestamp") LocalDateTime startTimestamp,
            @Param("endTimestamp") LocalDateTime endTimestamp,
            @Param("alignedStart") LocalDateTime alignedStart,
            @Param("stepSeconds") int stepSeconds
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

    /**
     * Distinct raw values of the latest readings, enough to tell how many decimals the sensor reports.
     */
    @Query(value = "SELECT DISTINCT r.value FROM (SELECT s.value FROM sensor_data s " +
            "WHERE s.device_id = :deviceId AND s.value IS NOT NULL ORDER BY s.timestamp DESC LIMIT 500) r",
            nativeQuery = true)
    List<Number> findRecentDistinctValues(@Param("deviceId") Long deviceId);

    @Query("SELECT COUNT(s) FROM SensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp >= :timestamp")
    long countByDeviceIdAndTimestampAfter(
            @Param("deviceId") Long deviceId,
            @Param("timestamp") LocalDateTime timestamp
    );

    @Query("SELECT s FROM SensorDataEntity s WHERE s.device.id = :deviceId ORDER BY s.timestamp DESC LIMIT 1")
    SensorDataEntity findLatestByDeviceId(@Param("deviceId") Long deviceId);
}