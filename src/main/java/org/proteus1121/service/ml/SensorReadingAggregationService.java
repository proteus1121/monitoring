package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Aggregates sensor readings for feature engineering and anomaly detection
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SensorReadingAggregationService {

    private final SensorDataRepository sensorDataRepository;

    /**
     * Get latest sensor values grouped by device type for a given time window
     * This simulates gathering correlated sensor readings from the same location/group
     */
    public Map<DeviceType, Double> getLatestValuesByTimeWindow(LocalDateTime windowStart, LocalDateTime windowEnd) {
        Map<DeviceType, Double> latestValues = new HashMap<>();

        // runs for every measurement: one indexed query over the window instead of one scan per device type,
        // rows are newest first so the first value seen for a type is its latest one
        for (Object[] row : sensorDataRepository.findTypeAndValueInWindow(windowStart, windowEnd)) {
            DeviceType deviceType = (DeviceType) row[0];
            Double value = (Double) row[1];
            if (deviceType == null || deviceType == DeviceType.UNKNOWN || value == null) continue;
            latestValues.putIfAbsent(deviceType, value);
        }

        return latestValues;
    }

    /**
     * Get latest sensor values for all active devices in the system
     * Fallback when specific location/group data is not available
     */
    public Map<DeviceType, Double> getLatestValuesAllDevices(LocalDateTime windowStart) {
        return getLatestValuesByTimeWindow(windowStart, LocalDateTime.now());
    }
}
