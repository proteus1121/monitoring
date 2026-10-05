package org.proteus1121.service.notifications;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.client.TelegramClient;
import org.proteus1121.model.telegram.SendMessageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * Sends a photo with the message as its caption (Telegram sendPhoto, multipart). A caption is limited to
 * 1024 characters: a longer message goes as a text message after the photo.
 */
@Slf4j
@Component
public class TelegramPhotoSender {

    static final int CAPTION_LIMIT = 1024;

    private final RestTemplate restTemplate;
    private final TelegramClient telegramClient;
    private final String baseUrl;

    public TelegramPhotoSender(RestTemplate restTemplate, TelegramClient telegramClient,
                               @Value("${telegram.api.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.telegramClient = telegramClient;
        this.baseUrl = baseUrl;
    }

    public void send(String chatId, byte[] jpeg, String fileName, String message) {
        boolean fits = message != null && message.length() <= CAPTION_LIMIT;

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("chat_id", chatId);
        body.add("photo", new ByteArrayResource(jpeg) {
            @Override
            public String getFilename() {
                return fileName;
            }
        });
        if (fits && !message.isBlank()) {
            body.add("caption", message);
            body.add("parse_mode", "Markdown");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        restTemplate.postForEntity(baseUrl + "/sendPhoto", new HttpEntity<>(body, headers), String.class);
        log.info("Telegram photo {} sent to chat {}", fileName, chatId);

        if (!fits && message != null && !message.isBlank()) {
            telegramClient.sendMessage(SendMessageRequest.builder()
                    .chatId(chatId)
                    .text(message)
                    .parseMode("Markdown")
                    .build());
        }
    }
}
