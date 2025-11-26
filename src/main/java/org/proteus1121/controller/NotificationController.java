package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.mapper.NotificationMapper;
import org.proteus1121.model.request.TelegramNotificationRequest;
import org.proteus1121.service.notifications.TelegramNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Manage Telegram notifications for users")
public class NotificationController {

    private final TelegramNotificationService telegramService;
    private final NotificationMapper mapper;

    @GetMapping
    @Operation(summary = "Get all notifications", description = "Retrieve all Telegram notifications for the current user")
    public ResponseEntity<List<TelegramNotification>> getNotifications() {
        User principal = getCurrentUser();
        return ResponseEntity.ok(telegramService.getNotifications(principal.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get notification by ID", description = "Retrieve a specific Telegram notification by its ID")
    public ResponseEntity<TelegramNotification> getNotificationById(@PathVariable Long id) {
        TelegramNotification notification = telegramService.getById(id);
        return ResponseEntity.ok(notification);
    }

    @PostMapping
    @Operation(summary = "Create a new notification", description = "Create a new Telegram notification for the current user")
    public ResponseEntity<TelegramNotification> createNotification(@RequestBody TelegramNotificationRequest notification) {
        Long userId = getCurrentUser().getId();
        TelegramNotification created = telegramService.create(mapper.toTelegramNotification(notification), userId);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing notification", description = "Update details of an existing Telegram notification")
    public ResponseEntity<TelegramNotification> updateNotification(@PathVariable Long id,
                                                                   @RequestBody TelegramNotificationRequest notificationRequest) {
        TelegramNotification notification = telegramService.checkNotification(id);
        mapper.toNotification(notificationRequest, notification);
        
        TelegramNotification updated = telegramService.update(id, notification);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a notification", description = "Delete a Telegram notification by its ID")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        telegramService.delete(id);
        return ResponseEntity.noContent().build();
    }
}