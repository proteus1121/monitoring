package org.proteus1121.model.telegram;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SendMessageRequest {

    @JsonProperty("chat_id")
    private String chatId;

    private String text;

    @JsonProperty("parse_mode")
    private String parseMode;           // "MarkdownV2", "HTML", etc.

    @JsonProperty("disable_web_page_preview")
    private Boolean disableWebPagePreview;

    @JsonProperty("disable_notification")
    private Boolean disableNotification;

    @JsonProperty("reply_to_message_id")
    private Integer replyToMessageId;

}
