package org.proteus1121.controller;

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
public class NotificationController {

    private final TelegramNotificationService telegramService;
    private final NotificationMapper mapper;

    @GetMapping
    public ResponseEntity<List<TelegramNotification>> getNotifications() {
        User principal = getCurrentUser();
        return ResponseEntity.ok(telegramService.getNotifications(principal.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TelegramNotification> getNotificationById(@PathVariable Long id) {
        TelegramNotification notification = telegramService.getById(id);
        return ResponseEntity.ok(notification);
    }

    @PostMapping
    public ResponseEntity<TelegramNotification> createNotification(@RequestBody TelegramNotificationRequest notification) {
        Long userId = getCurrentUser().getId();
        TelegramNotification created = telegramService.create(mapper.toTelegramNotification(notification), userId);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TelegramNotification> updateNotification(@PathVariable Long id,
                                                                   @RequestBody TelegramNotificationRequest notificationRequest) {
        TelegramNotification notification = telegramService.checkNotification(id);
        mapper.toNotification(notificationRequest, notification);
        
        TelegramNotification updated = telegramService.update(id, notification);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        telegramService.delete(id);
        return ResponseEntity.noContent().build();
    }
}