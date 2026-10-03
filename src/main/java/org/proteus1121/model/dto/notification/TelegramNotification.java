package org.proteus1121.model.dto.notification;

import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.NotificationChannel;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.enums.NotificationType;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TelegramNotification {

    private Long id;
    private User user;
    private NotificationChannel channel;
    private String telegramChatId;
    private String email;
    private NotificationType type;
    private String template;

}
