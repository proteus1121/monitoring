package org.proteus1121.model.dto.telegram;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Simplified Telegram webhook request structure.
 * Contains only the fields we need for basic message handling.
 */
@Data
public class TelegramWebhookRequest {
    
    @JsonProperty("update_id")
    private Long updateId;
    
    @JsonProperty("message")
    private Message message;
    
    @Data
    public static class Message {
        @JsonProperty("message_id")
        private Long messageId;
        
        @JsonProperty("from")
        private User from;
        
        @JsonProperty("chat")
        private Chat chat;
        
        @JsonProperty("text")
        private String text;
    }
    
    @Data
    public static class User {
        @JsonProperty("id")
        private Long id;
        
        @JsonProperty("first_name")
        private String firstName;
        
        @JsonProperty("username")
        private String username;
    }
    
    @Data
    public static class Chat {
        @JsonProperty("id")
        private Long id;
        
        @JsonProperty("type")
        private String type;
    }
}
