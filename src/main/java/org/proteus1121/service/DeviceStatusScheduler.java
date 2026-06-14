package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduler to periodically check device status and mark devices as offline
 * if they haven't sent data within their configured delay threshold.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceStatusScheduler {

    private final DeviceService deviceService;

    /**
     * Check for offline devices every minute
     */
    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    public void checkDeviceStatus() {
        log.debug("Checking device status for offline devices");
        try {
            deviceService.checkOfflineDevices();
        } catch (Exception e) {
            log.error("Error checking offline devices", e);
        }
    }
}
