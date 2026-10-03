package org.proteus1121.repository;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PredictedSensorDataRepository extends JpaRepository<PredictedSensorDataEntity, Long> {

    /**
     * Drops the not yet happened part of the previous forecast, it is replaced by a fresh one.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM PredictedSensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp > :after")
    int deleteByDeviceIdAndTimestampAfter(@Param("deviceId") Long deviceId, @Param("after") LocalDateTime after);

    @Query("SELECT s FROM PredictedSensorDataEntity s WHERE s.device.id = :deviceId AND s.timestamp BETWEEN :startTimestamp AND :endTimestamp")
    List<PredictedSensorDataEntity> findByDeviceIdAndTimestampRange(
            @Param("deviceId") Long deviceId,
            @Param("startTimestamp") LocalDateTime startTimestamp,
            @Param("endTimestamp") LocalDateTime endTimestamp
    );

}