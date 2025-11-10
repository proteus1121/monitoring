package org.proteus1121.model.telegram;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelegramMessageResponse {

    @JsonProperty("ok")
    private boolean ok;

    @JsonProperty("result")
    private TelegramResult result;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TelegramResult {

        @JsonProperty("message_id")
        private Long messageId;

        @JsonProperty("chat")
        private TelegramChat chat;

        @JsonProperty("from")
        private TelegramUser from;

        @JsonProperty("date")
        private Integer date;

        @JsonProperty("text")
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TelegramChat {

        @JsonProperty("id")
        private Long id;

        @JsonProperty("type")
        private String type;

        @JsonProperty("title")
        private String title;

        @JsonProperty("username")
        private String username;

        @JsonProperty("first_name")
        private String firstName;

        @JsonProperty("last_name")
        private String lastName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TelegramUser {

        @JsonProperty("id")
        private Long id;

        @JsonProperty("is_bot")
        private Boolean isBot;

        @JsonProperty("first_name")
        private String firstName;

        @JsonProperty("username")
        private String username;

        @JsonProperty("language_code")
        private String languageCode;
    }
}