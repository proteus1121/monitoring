package org.proteus1121.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.user.User;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MetricsPredictionScheduler {
    private final MetricService metricService;
    private final UserService userService;
    private final DeviceService deviceService;
    private ExecutorService executorService;

    @PostConstruct
    public void init() {
        // Thread pool size can be adjusted as needed
        this.executorService = Executors.newFixedThreadPool(8);
    }

    // Run every day at 00:05
    @Scheduled(cron = "0 5 0 * * *")
    public void predictAllUsersDevicesForNextDay() {
        log.info("Starting daily metrics prediction for all users and devices");
        List<User> users = userService.getUsers();
        LocalDateTime nextDayStart = LocalDate.now().plusDays(1).atStartOfDay();
        for (User user : users) {
            List<Device> devices = deviceService.getAllDevices(user.getId());
            for (Device device : devices) {
                executorService.submit(() -> {
                    try {
                        log.info("Predicting metrics for user {} device {} for {}", user.getId(), device.getId(), nextDayStart);
                        metricService.predictMetrics(device.getId(), nextDayStart);
                    } catch (Exception e) {
                        log.error("Failed to predict metrics for user {} device {}: {}", user.getId(), device.getId(), e.getMessage(), e);
                    }
                });
            }
        }
    }
}

