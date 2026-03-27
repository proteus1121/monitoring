package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service to identify devices suitable for ML-based anomaly detection
 * Devices need sufficient historical data to make accurate predictions
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PredictableDevicesService {

    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;

    private static final long MINIMUM_DATA_POINTS = 100; // Minimum sensor readings required

    /**
     * Get all devices that have sufficient historical data for predictions
     */
    public List<Long> getAllPredictableDevices() {
        var allDevices = deviceRepository.findAll();
        return allDevices.stream()
            .map(device -> device.getId())
            .filter(this::hasEnoughHistoricalData)
            .toList();
    }

    /**
     * Get devices marked as critical (higher priority for predictions)
     */
    public List<Long> getCriticalDevices() {
        // TODO: Implement based on your critical device marking strategy
        // For now, return all predictable devices
        return getAllPredictableDevices();
    }

    /**
     * Check if a device has enough historical data for ML training
     */
    private boolean hasEnoughHistoricalData(Long deviceId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long count = sensorDataRepository.countByDeviceIdAndTimestampAfter(deviceId, thirtyDaysAgo);
        return count >= MINIMUM_DATA_POINTS;
    }
}

