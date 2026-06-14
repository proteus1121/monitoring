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
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to handle Telegram webhook requests for device data reports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramWebhookService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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
        try {
            // Null check for the input list
            if (deviceValues == null || deviceValues.isEmpty()) {
                return "No devices found or no data available.";
            }
            
            StringBuilder message = new StringBuilder();
            message.append("📊 *Latest Sensor Readings*\n\n");
            
            for (DeviceSensorValues device : deviceValues) {
                // Skip null devices
                if (device == null) {
                    log.warn("Encountered null device in formatValuesAsMessage");
                    continue;
                }
                
                try {
                    String deviceName = device.getDeviceName();
                    if (deviceName == null || deviceName.trim().isEmpty()) {
                        deviceName = "Unknown Device";
                    }
                    message.append("*").append(escapeMarkdown(deviceName)).append("*");
                    
                    String description = device.getDeviceDescription();
                    if (description != null && !description.trim().isEmpty()) {
                        message.append(" (").append(escapeMarkdown(description)).append(")");
                    }
                    message.append("\n");
                    
                    Map<DeviceType, DeviceSensorValues.SensorValue> values = device.getValues();
                    
                    if (values == null || values.isEmpty()) {
                        message.append("  _No recent data_\n");
                    } else {
                        for (Map.Entry<DeviceType, DeviceSensorValues.SensorValue> entry : values.entrySet()) {
                            if (entry == null || entry.getKey() == null) {
                                continue;
                            }
                            
                            try {
                                DeviceType type = entry.getKey();
                                DeviceSensorValues.SensorValue sensorValue = entry.getValue();
                                
                                if (sensorValue == null) {
                                    log.debug("Null sensor value for device {} type {}", deviceName, type);
                                    continue;
                                }
                                
                                String emoji = getEmojiForSensor(type);
                                String formattedValue = formatSensorValue(type, sensorValue.getValue());
                                
                                message.append("  ").append(emoji).append(" ")
                                       .append(type.name()).append(": ")
                                       .append(formattedValue)
                                       .append("\n");

                                if (sensorValue.getTimestamp() != null) {
                                    try {
                                        message.append("    _")
                                               .append(sensorValue.getTimestamp().format(DATE_TIME_FORMATTER))
                                               .append("_\n");
                                    } catch (Exception e) {
                                        log.warn("Error formatting timestamp for device {}: {}", deviceName, e.getMessage());
                                        // Continue without timestamp
                                    }
                                }
                            } catch (Exception e) {
                                log.error("Error formatting sensor entry for device {}: {}", deviceName, e.getMessage(), e);
                                // Continue with next sensor
                            }
                        }
                    }
                    
                    message.append("\n");
                } catch (Exception e) {
                    log.error("Error formatting device {}: {}", device.getDeviceId(), e.getMessage(), e);
                    message.append("_Error formatting device data_\n\n");
                    // Continue with next device
                }
            }
            
            try {
                message.append("_Report Generated: ").append(LocalDateTime.now().format(DATE_TIME_FORMATTER)).append("_");
            } catch (Exception e) {
                log.warn("Error formatting report timestamp: {}", e.getMessage());
                message.append("_Report Generated: ").append(LocalDateTime.now()).append("_");
            }
            
            return message.toString();
            
        } catch (Exception e) {
            log.error("Critical error in formatValuesAsMessage: {}", e.getMessage(), e);
            return "⚠️ Error generating sensor report. Please try again later.";
        }
    }

    private DeviceSensorValues getLatestSensorValuesForDevice(DeviceEntity device) {
        // Null check for device
        if (device == null) {
            log.warn("Attempted to get sensor values for null device");
            return null;
        }
        
        try {
            // Query for the latest sensor data for this device
            SensorDataEntity latestSensorData = sensorDataRepository.findLatestByDeviceId(device.getId());
            
            if (latestSensorData == null) {
                log.debug("No sensor data found for device: {}", device.getId());
                return DeviceSensorValues.builder()
                        .deviceId(device.getId())
                        .deviceName(device.getName() != null ? device.getName() : "Unknown Device")
                        .deviceDescription(device.getDescription())
                        .values(Collections.emptyMap())
                        .lastUpdated(LocalDateTime.now())
                        .build();
            }
            
            // Create a map with the latest sensor value
            Map<DeviceType, DeviceSensorValues.SensorValue> latestValues = new HashMap<>();
            
            // Safe handling of device type
            DeviceType deviceType = device.getType();
            if (deviceType != null) {
                latestValues.put(
                    deviceType,
                    DeviceSensorValues.SensorValue.builder()
                            .value(latestSensorData.getValue())
                            .timestamp(latestSensorData.getTimestamp())
                            .build()
                );
            } else {
                log.warn("Device {} has null type", device.getId());
            }
            
            return DeviceSensorValues.builder()
                    .deviceId(device.getId())
                    .deviceName(device.getName() != null ? device.getName() : "Unknown Device")
                    .deviceDescription(device.getDescription())
                    .values(latestValues)
                    .lastUpdated(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            log.error("Error fetching sensor data for device {}: {}", 
                     device.getId() != null ? device.getId() : "unknown", 
                     e.getMessage(), e);
            return null;
        }
    }

    private String getEmojiForSensor(DeviceType type) {
        if (type == null) {
            return "📊";
        }
        
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
        
        if (type == null) {
            return String.format("%.2f", value);
        }
        
        try {
            return switch (type) {
                case TEMPERATURE -> String.format("%.1f°C", value);
                case HUMIDITY -> String.format("%.1f%%", value);
                case LPG, CH4, SMOKE -> String.format("%.2f ppm", value);
                case FLAME, MOTION -> value > 0 ? "DETECTED" : "None";
                case LIGHT -> String.format("%.0f lux", value);
                case PRESSURE -> String.format("%.1f hPa", value);
                default -> String.format("%.2f", value);
            };
        } catch (Exception e) {
            log.warn("Error formatting sensor value for type {}: {}", type, e.getMessage());
            return String.format("%.2f", value);
        }
    }

    private String escapeMarkdown(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        
        try {
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
        } catch (Exception e) {
            log.warn("Error escaping markdown for text: {}", e.getMessage());
            return text; // Return original text if escaping fails
        }
    }
}
