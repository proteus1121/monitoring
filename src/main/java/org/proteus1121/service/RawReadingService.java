package org.proteus1121.service;

import org.proteus1121.model.dto.device.RawReading;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Last raw ADC value of each analog sensor (users/{userId}/devices/{deviceId}/raw), kept in memory: the site
 * shows it while the user calibrates the sensor, nothing else needs its history.
 */
@Service
public class RawReadingService {

    private final Map<Long, RawReading> latest = new ConcurrentHashMap<>();

    public void put(Long deviceId, double value) {
        latest.put(deviceId, new RawReading(value, LocalDateTime.now()));
    }

    public RawReading get(Long deviceId) {
        return latest.get(deviceId);
    }
}
