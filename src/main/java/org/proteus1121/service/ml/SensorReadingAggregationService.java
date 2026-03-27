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
        
        // Fetch the most recent reading for each device type within the window
        for (DeviceType deviceType : DeviceType.values()) {
            if (deviceType == DeviceType.UNKNOWN) continue;
            
            // Query the latest sensor data for this type within the window
            var readings = sensorDataRepository.findLatestByDeviceTypeInWindow(
                deviceType.name().toLowerCase(), 
                windowStart, 
                windowEnd
            );
            
            if (!readings.isEmpty()) {
                latestValues.put(deviceType, readings.get(0).getValue());
            }
        }
        
        return latestValues;
    }

    /**
     * Get latest sensor values for all active devices in the system
     * Fallback when specific location/group data is not available
     */
    public Map<DeviceType, Double> getLatestValuesAllDevices(LocalDateTime windowStart) {
        Map<DeviceType, Double> latestValues = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (DeviceType deviceType : DeviceType.values()) {
            if (deviceType == DeviceType.UNKNOWN) continue;
            
            // Get most recent reading for this device type
            var readings = sensorDataRepository.findLatestByDeviceTypeInWindow(
                deviceType.name().toLowerCase(), 
                windowStart, 
                now
            );
            
            if (!readings.isEmpty()) {
                latestValues.put(deviceType, readings.get(0).getValue());
            }
        }
        
        return latestValues;
    }
}

