package org.proteus1121.service.notifications;

import lombok.extern.slf4j.Slf4j;
import java.util.regex.Pattern;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.proteus1121.model.enums.NotificationChannel;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.proteus1121.client.TelegramClient;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.dto.user.DeviceUser;
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
import java.util.Objects;
import java.util.Set;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;
    private final TelegramClient telegramClient;
    private final EmailSender emailSender;

    @Value("${telegram.bot-token:}")
    private String telegramBotToken;

    // sending can take seconds (SMTP, Telegram retries); never block the MQTT thread with it
    private final ExecutorService sender = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "notification-sender");
        thread.setDaemon(true);
        return thread;
    });

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
        validate(notification);
        UserEntity userEntity = userRepository.findById(userId).orElseThrow(() ->
                new RuntimeException("User " + userId + " not found"));//TODO: exception handling
        NotificationEntity telegramEntity = notificationMapper.toEntity(notification, userEntity);
        NotificationEntity entity = repository.save(telegramEntity);
        return notificationMapper.toTelegramNotification(entity);
    }

    public TelegramNotification update(Long id, TelegramNotification notification) {
        validate(notification);
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
                .parseMode("Markdown")
                .build();
        telegramClient.sendMessage(messageRequest);
    }

    public void sendCriticalNotifications(Set<DeviceUser> recipients, Device device, Double value) {
        sendCriticalNotifications(recipients, device, value, null);
    }

    /**
     * @param description explanation from the language model; replaces {{description}} in the template or,
     *                    when the template has no such placeholder, is added after the message
     */
    public void sendCriticalNotifications(Set<DeviceUser> recipients, Device device, Double value, String description) {

        for (DeviceUser user : recipients) {
            getNotifications(user.getUserId()).stream()
                    .filter(n -> n.getType() == NotificationType.CRITICAL)
                    .forEach(n -> {
                        String message = withDescription(getMessage(n.getTemplate(), user, device, value),
                                n.getTemplate(), description);
                        String subject = "Critical alert: " + (device != null ? device.getName() : "device");
                        sender.submit(() -> {
                            try {
                                deliver(n, subject, message);
                            } catch (Exception e) {
                                log.error("Failed to send {} notification {}", n.getChannel(), n.getId(), e);
                            }
                        });
                    });
        }
    }

    /**
     * Sends a sample message right away so the user can check the channel settings.
     */
    public void sendTest(TelegramNotification notification) {
        String message = "Test notification from Smart Sensor Network.\n\n"
                + withDescription(getMessage(notification.getTemplate(), null, null, null), notification.getTemplate(),
                "[the explanation written by the language model appears here]");
        deliver(notification, "Test notification", message);
    }

    private static String withDescription(String message, String template, String description) {
        boolean hasPlaceholder = template != null && template.contains("{{description}}");
        if (description == null || description.isBlank()) {
            return hasPlaceholder ? message.replace("{{description}}", "") : message;
        }
        return hasPlaceholder ? message.replace("{{description}}", description) : message + "\n\n" + description;
    }

    public Map<String, Boolean> channelStatus() {
        return Map.of(
                NotificationChannel.TELEGRAM.name(), telegramBotToken != null && !telegramBotToken.isBlank()
                        && !"token".equals(telegramBotToken),
                NotificationChannel.EMAIL.name(), emailSender.isConfigured());
    }

    private void deliver(TelegramNotification notification, String subject, String message) {
        if (notification.getChannel() == NotificationChannel.EMAIL) {
            emailSender.send(notification.getEmail(), "[Smart Sensor Network] " + subject, message);
        } else {
            sendNotification(notification.getTelegramChatId(), message);
        }
    }

    private static void validate(TelegramNotification notification) {
        if (notification.getChannel() == null) {
            notification.setChannel(NotificationChannel.TELEGRAM);
        }
        if (notification.getType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type is required");
        }
        if (notification.getChannel() == NotificationChannel.EMAIL) {
            if (notification.getEmail() == null || !EMAIL.matcher(notification.getEmail()).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid e-mail address is required");
            }
            notification.setTelegramChatId(null);
        } else {
            if (notification.getTelegramChatId() == null || notification.getTelegramChatId().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telegram chat id is required");
            }
            notification.setEmail(null);
        }
    }

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

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
    private String getMessage(String template, DeviceUser user, Device device, Double value) {
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

    public TelegramNotification checkNotification(Long id) {
        TelegramNotification notification = getById(id);

        if (!Objects.equals(notification.getUser().getId(), getCurrentUser().getId())) {
            //TODO: exception handling
            throw new RuntimeException("Device " + id + " belong to another user");
        }

        return notification;
    }
}
