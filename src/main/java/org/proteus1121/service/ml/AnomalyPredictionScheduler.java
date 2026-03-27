package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.service.MetricService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Scheduled service for daily anomaly prediction jobs
 * Runs predictions for all devices using a thread pool to handle concurrent execution
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyPredictionScheduler {

    private final MetricService metricService;
    private final PredictableDevicesService predictableDevicesService;

    // Thread pool for concurrent prediction tasks
    private final ExecutorService executorService = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() - 1),
        new ThreadFactory() {
            private final AtomicInteger threadNumber = new AtomicInteger(1);

            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "anomaly-predictor-" + threadNumber.getAndIncrement());
                t.setDaemon(false);
                return t;
            }
        }
    );

    /**
     * Run daily at 00:00 (midnight) UTC to predict metrics for the next day
     * This allows the system to be proactive about anomalies
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    public void scheduleDailyPredictions() {
        log.info("Starting daily anomaly prediction batch job");
        
        try {
            // Get all predictable devices (those with enough historical data)
            var devices = predictableDevicesService.getAllPredictableDevices();
            log.info("Found {} devices for daily prediction", devices.size());

            // Calculate prediction window: from 1 year ago to today
            LocalDateTime startOfPredictionWindow = LocalDateTime.now().minusDays(365);

            // Submit prediction tasks to thread pool
            for (Long deviceId : devices) {
                executorService.submit(() -> {
                    try {
                        log.debug("Predicting metrics for device {} starting from {}", deviceId, startOfPredictionWindow);
                        metricService.predictMetrics(deviceId, startOfPredictionWindow);
                        log.debug("Successfully predicted metrics for device {}", deviceId);
                    } catch (Exception e) {
                        log.error("Failed to predict metrics for device {}", deviceId, e);
                    }
                });
            }

            log.info("Submitted {} prediction tasks to thread pool", devices.size());
        } catch (Exception e) {
            log.error("Daily prediction batch job failed", e);
        }
    }

    /**
     * Optional: Run hourly predictions for high-priority devices
     * Adjust cron expression as needed (currently disabled, uncomment to enable)
     */
    @Scheduled(cron = "0 0 * * * *", zone = "UTC")  // Run every hour at :00
    public void scheduleHourlyPredictionsForCriticalDevices() {
        log.debug("Starting hourly anomaly prediction for critical devices");
        
        try {
            var criticalDevices = predictableDevicesService.getCriticalDevices();
            LocalDateTime startOfPredictionWindow = LocalDateTime.now().minusDays(30); // Last 30 days

            for (Long deviceId : criticalDevices) {
                executorService.submit(() -> {
                    try {
                        metricService.predictMetrics(deviceId, startOfPredictionWindow);
                    } catch (Exception e) {
                        log.error("Failed hourly prediction for critical device {}", deviceId, e);
                    }
                });
            }
        } catch (Exception e) {
            log.error("Hourly prediction job failed", e);
        }
    }
}

