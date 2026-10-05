package org.proteus1121.service.llm;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.entity.IncidentEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.Severity;
import org.proteus1121.repository.SensorDataRepository;
import org.proteus1121.service.DeviceService;
import org.proteus1121.service.IncidentService;
import org.proteus1121.service.notifications.TelegramNotificationService;
import org.proteus1121.service.CameraService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Raises an incident: it is stored right away (so repeated readings do not create duplicates), then in the
 * background the language model explains it and the notifications go out with that explanation.
 * Without the model, or if it fails, notifications are sent with the plain template.
 */
@Slf4j
@Service
public class AlertPipeline {

    private static final int RECENT_HOURS = 6;
    private static final int NEIGHBOUR_MAX_AGE_MINUTES = 30;
    // a camera sends the frame of its alarm right after it; usually here before the incident is written
    private static final long CAMERA_FRAME_WAIT_MS = 5000;

    private final IncidentService incidentService;
    private final DeviceService deviceService;
    private final TelegramNotificationService notificationService;
    private final TextGenerationService textGeneration;
    private final SensorFactsFactory sensorFacts;
    private final SensorDataRepository sensorDataRepository;
    // the camera service reaches the devices and the alerts: taken when needed
    private final ObjectProvider<CameraService> cameraService;
    // one model call at a time: the free tier allows only a few requests per minute
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "alert-pipeline");
        thread.setDaemon(true);
        return thread;
    });

    public AlertPipeline(IncidentService incidentService, DeviceService deviceService,
                         TelegramNotificationService notificationService, TextGenerationService textGeneration,
                         SensorFactsFactory sensorFacts, SensorDataRepository sensorDataRepository,
                         ObjectProvider<CameraService> cameraService) {
        this.incidentService = incidentService;
        this.deviceService = deviceService;
        this.notificationService = notificationService;
        this.textGeneration = textGeneration;
        this.sensorFacts = sensorFacts;
        this.sensorDataRepository = sensorDataRepository;
        this.cameraService = cameraService;
    }

    public void raise(String title, Device device, double value) {
        IncidentEntity incident = incidentService.createIncident(title, Severity.CRITICAL, List.of(device));
        Set<DeviceUser> recipients = deviceService.getUsersByDeviceId(device.getId());

        executor.submit(() -> {
            // a camera's flame: the frame with the flame's box, kept with the incident and sent with the alerts
            byte[] image = cameraImage(device, value);
            if (image != null) {
                incidentService.saveImage(incident.getId(), image);
            }
            String description = null;
            try {
                if (textGeneration.isEnabled()) {
                    description = textGeneration.describeIncident(title, sensorFacts.of(device), value,
                            recentAverages(device.getId()), neighbours(device, recipients)).orElse(null);
                    if (description != null) {
                        incidentService.setDescription(incident.getId(), description);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to describe incident {}: {}", incident.getId(), e.getMessage());
            }
            notificationService.sendCriticalNotifications(recipients, device, value, description, image);
        });
    }

    private byte[] cameraImage(Device device, double value) {
        if (value <= 0) {
            return null;
        }
        try {
            CameraService cameras = cameraService.getIfAvailable();
            return cameras == null ? null : cameras.alarmImage(device.getId(), CAMERA_FRAME_WAIT_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.warn("No camera frame for device {}: {}", device.getId(), e.getMessage());
            return null;
        }
    }

    private List<Double> recentAverages(Long deviceId) {
        return sensorDataRepository.findHourlyAverages(deviceId, LocalDateTime.now().minusHours(RECENT_HOURS)).stream()
                .map(row -> ((Number) row[1]).doubleValue())
                .toList();
    }

    private List<String> neighbours(Device device, Set<DeviceUser> recipients) {
        Long ownerId = recipients.stream()
                .filter(user -> user.getRole() == DeviceRole.OWNER)
                .map(DeviceUser::getUserId)
                .findFirst()
                .orElse(null);
        if (ownerId == null) {
            return List.of();
        }
        LocalDateTime freshAfter = LocalDateTime.now().minusMinutes(NEIGHBOUR_MAX_AGE_MINUTES);
        List<String> lines = new ArrayList<>();
        for (Device other : deviceService.getAllDevices(ownerId)) {
            if (Objects.equals(other.getId(), device.getId())) continue;
            SensorDataEntity latest = sensorDataRepository.findLatestByDeviceId(other.getId());
            if (latest == null || latest.getValue() == null || latest.getTimestamp().isBefore(freshAfter)) continue;
            lines.add("%s (%s): %s %s".formatted(other.getName(),
                    other.getType() == null ? "unknown" : other.getType().name().toLowerCase(),
                    latest.getValue(), SensorFactsFactory.unit(other.getType())).trim());
        }
        return lines;
    }
}
