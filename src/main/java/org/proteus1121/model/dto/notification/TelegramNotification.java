package org.proteus1121.model.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.enums.NotificationType;

@Data
@AllArgsConstructor
public class TelegramNotification {

    private Long id;
    private User user;
    private String telegramChatId;
    private NotificationType type;
    private String template;

}
