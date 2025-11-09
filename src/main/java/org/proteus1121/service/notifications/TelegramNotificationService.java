package org.proteus1121.service.notifications;

import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.proteus1121.client.TelegramClient;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.NotificationEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.NotificationType;
import org.proteus1121.model.mapper.NotificationMapper;
import org.proteus1121.model.telegram.SendMessageRequest;
import org.proteus1121.repository.NotificationRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;
    private final TelegramClient telegramClient;

    public List<TelegramNotification> getNotifications(Long userId) {
        return repository.findAllByUserId(userId).stream()
                .map(notificationMapper::toTelegramNotification)
                .toList();
    }

    public TelegramNotification getById(Long id) {
        return repository.findById(id).map(notificationMapper::toTelegramNotification)
                .orElseThrow(() -> new RuntimeException("Not found"));
    }

    public TelegramNotification create(TelegramNotification notification, Long userId) {
        UserEntity userEntity = userRepository.findById(userId).orElseThrow(() ->
                new RuntimeException("User " + userId + " not found"));//TODO: exception handling
        NotificationEntity telegramEntity = notificationMapper.toEntity(notification, userEntity);
        NotificationEntity entity = repository.save(telegramEntity);
        return notificationMapper.toTelegramNotification(entity);
    }

    public TelegramNotification update(Long id, TelegramNotification notification) {
        NotificationEntity entity = repository.save(notificationMapper.toEntity(id, notification));
        return notificationMapper.toTelegramNotification(entity);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
    
    public void sendNotification(String telegramChatId, String message) {
        SendMessageRequest messageRequest = SendMessageRequest.builder()
                .chatId(telegramChatId)
                .text(message)
                .build();
        telegramClient.sendMessage(messageRequest);
    }

    public void sendCriticalNotifications(Device device, Double value) {
        User user = device.getUser();
        
        getNotifications(user.getId()).stream()
                .filter(n -> n.getType() == NotificationType.CRITICAL)
                .forEach(n -> sendNotification(n.getTelegramChatId(), getMessage(n.getTemplate(), user, device, value)));
    }

    /**
     * Builds a message by replacing placeholders in the template.
     * Supported placeholders:
     *  - %{username}
     *  - {{device_name}}
     *  - {{current_value}}
     *  - {{lower_value}}
     *  - {{critical_value}}
     *  - {{device_location}}
     *  - {{timestamp}}  -> ISO-8601 date/time
     * Null fields are replaced with "N/A".
     */
    private String getMessage(String template, User user, Device device, Double value) {
        if (template == null || template.isEmpty()) {
            return StringUtils.EMPTY;
        }

        Map<String, String> values = new HashMap<>();
        values.put("username", safe(user != null ? user.getUsername() : null));
        values.put("device_name", safe(device != null ? device.getName() : null));
        values.put("current_value", safeNumber(value));
        values.put("lower_value", safeNumber(device != null ? device.getLowerValue() : null));
        values.put("critical_value", safeNumber(device != null ? device.getCriticalValue() : null));
        values.put("device_location", safe(device != null ? device.getDescription() : null));

        // Timestamp in ISO-8601 with zone
        String timestamp = ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        values.put("timestamp", timestamp);

        // Replace both styles: {{key}} and %{key}
        String result = template;
        for (Map.Entry<String, String> e : values.entrySet()) {
            String key = e.getKey();
            String val = e.getValue();

            // {{key}}
            result = result.replace("{{" + key + "}}", val);
            // %{key}
            result = result.replace("%{" + key + "}", val);
        }

        return result;
    }

    private static String safe(String s) {
        return (s == null || s.isBlank()) ? "N/A" : s;
    }

    private static String safeNumber(Double d) {
        if (d == null) return "N/A";
        // Trim trailing zeros (e.g., 42.0 -> 42), but keep decimals if needed
        String str = String.valueOf(d);
        if (str.contains(".")) {
            str = str.replaceAll("([0-9]*\\.[0-9]*?[1-9])0+$", "$1")
                    .replaceAll("\\.0+$", "");
        }
        return str;
    }
}
