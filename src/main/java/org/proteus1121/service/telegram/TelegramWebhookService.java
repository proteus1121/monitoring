package org.proteus1121.service.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.telegram.DeviceSensorValues;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.NotificationEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.NotificationRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to handle Telegram webhook requests for device data reports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramWebhookService {

    private final NotificationRepository notificationRepository;
    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;

    /**
     * Get latest sensor values for all devices associated with a Telegram chat ID.
     * 
     * @param chatId Telegram chat ID
     * @return List of devices with their latest sensor values
     */
    public List<DeviceSensorValues> getLatestValuesForChatId(String chatId) {
        log.debug("Fetching latest values for chat ID: {}", chatId);
        
        // Find user by chat_id
        List<NotificationEntity> notifications = notificationRepository.findByTelegramChatId(chatId);
        
        if (notifications.isEmpty()) {
            log.warn("No user found for chat ID: {}", chatId);
            return Collections.emptyList();
        }
        
        // Get the first notification's user (should be unique per chat_id)
        Long userId = notifications.get(0).getUser().getId();
        log.debug("Found user ID: {} for chat ID: {}", userId, chatId);
        
        // Get all devices for this user
        List<DeviceEntity> devices = deviceRepository.findDevicesByUserId(userId);
        log.debug("Found {} devices for user ID: {}", devices.size(), userId);
        
        if (devices.isEmpty()) {
            return Collections.emptyList();
        }
        
        // For each device, get the latest sensor data
        return devices.stream()
                .map(this::getLatestSensorValuesForDevice)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Format the sensor values as a human-readable message.
     * 
     * @param deviceValues List of device sensor values
     * @return Formatted message
     */
    public String formatValuesAsMessage(List<DeviceSensorValues> deviceValues) {
        if (deviceValues.isEmpty()) {
            return "No devices found or no data available.";
        }
        
        StringBuilder message = new StringBuilder();
        message.append("📊 *Latest Sensor Readings*\n\n");
        
        for (DeviceSensorValues device : deviceValues) {
            message.append("*").append(escapeMarkdown(device.getDeviceName())).append("*");
            
            if (device.getDeviceDescription() != null && !device.getDeviceDescription().isEmpty()) {
                message.append(" (").append(escapeMarkdown(device.getDeviceDescription())).append(")");
            }
            message.append("\n");
            
            Map<DeviceType, DeviceSensorValues.SensorValue> values = device.getValues();
            
            if (values.isEmpty()) {
                message.append("  _No recent data_\n");
            } else {
                for (Map.Entry<DeviceType, DeviceSensorValues.SensorValue> entry : values.entrySet()) {
                    DeviceType type = entry.getKey();
                    DeviceSensorValues.SensorValue sensorValue = entry.getValue();
                    
                    String emoji = getEmojiForSensor(type);
                    String formattedValue = formatSensorValue(type, sensorValue.getValue());
                    
                    message.append("  ").append(emoji).append(" ")
                           .append(type.name()).append(": ")
                           .append(formattedValue).append("\n");
                }
            }
            
            message.append("\n");
        }
        
        message.append("_Updated: ").append(LocalDateTime.now().toString()).append("_");
        
        return message.toString();
    }

    private DeviceSensorValues getLatestSensorValuesForDevice(DeviceEntity device) {
        try {
            // Query for the latest sensor data for this device (last 24 hours)
            LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
            List<SensorDataEntity> sensorData = sensorDataRepository.findByDeviceIdAndTimestampRange(
                    device.getId(), 
                    oneDayAgo, 
                    LocalDateTime.now()
            );
            
            if (sensorData.isEmpty()) {
                log.debug("No sensor data found for device: {}", device.getId());
                return DeviceSensorValues.builder()
                        .deviceId(device.getId())
                        .deviceName(device.getName())
                        .deviceDescription(device.getDescription())
                        .values(Collections.emptyMap())
                        .build();
            }
            
            // Get the most recent value (last in the list if ordered by timestamp)
            Map<DeviceType, DeviceSensorValues.SensorValue> latestValues = new HashMap<>();
            
            // Group by device type and take the latest
            Map<DeviceType, Optional<SensorDataEntity>> latestByType = sensorData.stream()
                    .collect(Collectors.groupingBy(
                            sd -> sd.getDevice().getType(),
                            Collectors.maxBy(Comparator.comparing(SensorDataEntity::getTimestamp))
                    ));
            
            for (Map.Entry<DeviceType, Optional<SensorDataEntity>> entry : latestByType.entrySet()) {
                entry.getValue().ifPresent(sd -> 
                    latestValues.put(
                        entry.getKey(),
                        DeviceSensorValues.SensorValue.builder()
                                .value(sd.getValue())
                                .timestamp(sd.getTimestamp())
                                .build()
                    )
                );
            }
            
            return DeviceSensorValues.builder()
                    .deviceId(device.getId())
                    .deviceName(device.getName())
                    .deviceDescription(device.getDescription())
                    .values(latestValues)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error fetching sensor data for device {}: {}", device.getId(), e.getMessage());
            return null;
        }
    }

    private String getEmojiForSensor(DeviceType type) {
        return switch (type) {
            case TEMPERATURE -> "🌡️";
            case HUMIDITY -> "💧";
            case LPG -> "⚠️";
            case CH4 -> "⚠️";
            case SMOKE -> "💨";
            case FLAME -> "🔥";
            case LIGHT -> "💡";
            case PRESSURE -> "🎚️";
            case MOTION -> "🏃";
            default -> "📊";
        };
    }

    private String formatSensorValue(DeviceType type, Double value) {
        if (value == null) {
            return "N/A";
        }
        
        return switch (type) {
            case TEMPERATURE -> String.format("%.1f°C", value);
            case HUMIDITY -> String.format("%.1f%%", value);
            case LPG, CH4, SMOKE -> String.format("%.2f ppm", value);
            case FLAME, MOTION -> value > 0 ? "DETECTED" : "None";
            case LIGHT -> String.format("%.0f lux", value);
            case PRESSURE -> String.format("%.1f hPa", value);
            default -> String.format("%.2f", value);
        };
    }

    private String escapeMarkdown(String text) {
        if (text == null) {
            return "";
        }
        // Escape special Markdown characters
        return text.replace("_", "\\_")
                   .replace("*", "\\*")
                   .replace("[", "\\[")
                   .replace("]", "\\]")
                   .replace("(", "\\(")
                   .replace(")", "\\)")
                   .replace("~", "\\~")
                   .replace("`", "\\`")
                   .replace(">", "\\>")
                   .replace("#", "\\#")
                   .replace("+", "\\+")
                   .replace("-", "\\-")
                   .replace("=", "\\=")
                   .replace("|", "\\|")
                   .replace("{", "\\{")
                   .replace("}", "\\}")
                   .replace(".", "\\.")
                   .replace("!", "\\!");
    }
}
