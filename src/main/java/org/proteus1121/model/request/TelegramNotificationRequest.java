package org.proteus1121.model.request;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.NotificationType;

@Data
@NoArgsConstructor
public class TelegramNotificationRequest {

    private String telegramChatId;
    private NotificationType type;
    private String template;
    
}
