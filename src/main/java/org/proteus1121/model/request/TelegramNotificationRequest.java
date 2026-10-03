package org.proteus1121.model.request;

import org.proteus1121.model.enums.NotificationChannel;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.NotificationType;

@Data
@NoArgsConstructor
public class TelegramNotificationRequest {

    private NotificationChannel channel;
    private String telegramChatId;
    private String email;
    private NotificationType type;
    private String template;
    
}
