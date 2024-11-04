package org.proteus1121.model.dto.notification;

import lombok.Data;

@Data
public class TelegramNotification {

    private String chatId;
    private String message;

}
