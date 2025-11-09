package org.proteus1121.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.dto.user.User;
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
    public ResponseEntity<TelegramNotification> createNotification(@RequestBody TelegramNotification notification) {
        Long userId = getCurrentUser().getId();
        TelegramNotification created = telegramService.create(notification, userId);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TelegramNotification> updateNotification(@PathVariable Long id,
                                                                   @RequestBody TelegramNotification notification) {
        TelegramNotification updated = telegramService.update(id, notification);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        telegramService.delete(id);
        return ResponseEntity.noContent().build();
    }
}