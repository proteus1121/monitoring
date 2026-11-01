package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.client.TelegramClient;
import org.proteus1121.model.dto.telegram.DeviceSensorValues;
import org.proteus1121.model.dto.telegram.TelegramWebhookRequest;
import org.proteus1121.model.telegram.SendMessageRequest;
import org.proteus1121.service.telegram.TelegramWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import feign.FeignException;
import java.util.ArrayList;
import java.util.List;

/**
 * Controller for handling Telegram webhook requests.
 * This endpoint is unauthenticated to allow Telegram servers to call it.
 */
@Slf4j
@RestController
@RequestMapping("/webhook/telegram")
@RequiredArgsConstructor
@Tag(name = "Telegram Webhook", description = "Webhook endpoint for Telegram bot integration")
public class TelegramWebhookController {

    // Telegram's limit for the text of one message
    private static final int MESSAGE_LIMIT = 4096;

    private final TelegramWebhookService webhookService;
    private final TelegramClient telegramClient;

    @PostMapping
    @Operation(
        summary = "Telegram webhook endpoint", 
        description = "Receives webhook requests from Telegram bot and responds with device sensor data"
    )
    public ResponseEntity<String> handleWebhook(@RequestBody TelegramWebhookRequest request) {
        try {
            log.info("Received Telegram webhook: updateId={}", request.getUpdateId());
            
            if (request.getMessage() == null || request.getMessage().getChat() == null) {
                log.warn("Invalid webhook request: missing message or chat");
                return ResponseEntity.ok("OK");
            }
            
            String chatId = request.getMessage().getChat().getId().toString();
            String messageText = request.getMessage().getText();
            
            log.debug("Chat ID: {}, Message: {}", chatId, messageText);
            
            // Check if this is a request for latest values
            if (messageText != null && isReportRequest(messageText)) {
                handleReportRequest(chatId);
            } else {
                log.debug("Message not recognized as a report request: {}", messageText);
            }
            
            return ResponseEntity.ok("OK");
            
        } catch (Exception e) {
            log.error("Error handling Telegram webhook: {}", e.getMessage(), e);
            // Still return OK to Telegram to avoid retries
            return ResponseEntity.ok("OK");
        }
    }

    /**
     * Get latest sensor values for a specific chat ID and return as JSON.
     * This endpoint can be used for testing or direct API access.
     */
    @GetMapping("/report/{chatId}")
    @Operation(
        summary = "Get device report by chat ID",
        description = "Returns latest sensor values for all devices associated with a Telegram chat ID"
    )
    public ResponseEntity<List<DeviceSensorValues>> getReport(@PathVariable String chatId) {
        log.info("Manual report request for chat ID: {}", chatId);
        
        List<DeviceSensorValues> values = webhookService.getLatestValuesForChatId(chatId);
        return ResponseEntity.ok(values);
    }

    private void handleReportRequest(String chatId) {
        try {
            // Get latest values for all user's devices
            List<DeviceSensorValues> values = webhookService.getLatestValuesForChatId(chatId);
            
            // Format as message
            String message = webhookService.formatValuesAsMessage(values);
            
            // Send back to user; a message is at most 4096 characters, many devices need several
            for (String part : split(message)) {
                send(chatId, part);
            }
            log.info("Sent report to chat ID: {}", chatId);
            
        } catch (Exception e) {
            log.error("Error sending report to chat ID {}: {}", chatId, e.getMessage(), e);
            
            // Send error message to user
            try {
                SendMessageRequest errorMessage = SendMessageRequest.builder()
                        .chatId(chatId)
                        .text("Sorry, I couldn't retrieve your device data. Please try again later.")
                        .build();
                telegramClient.sendMessage(errorMessage);
            } catch (Exception sendError) {
                log.error("Failed to send error message: {}", sendError.getMessage());
            }
        }
    }

    private boolean isReportRequest(String text) {
        if (text == null) {
            return false;
        }
        
        // first word only, without the bot name Telegram adds in groups: "/latest@SsnBot" -> "/latest"
        String command = text.trim().split("\\s+", 2)[0].toLowerCase();
        int at = command.indexOf('@');
        if (at >= 0) {
            command = command.substring(0, at);
        }
        return command.equals("/latest") || command.equals("/report");
    }

    private void send(String chatId, String html) {
        try {
            telegramClient.sendMessage(SendMessageRequest.builder()
                    .chatId(chatId)
                    .text(html)
                    .parseMode("HTML")
                    .build());
        } catch (FeignException.BadRequest e) {
            // the formatting was refused ("can't parse entities"): the readings still go out, without it
            log.warn("Telegram refused the HTML report for chat {}, sending plain text: {}", chatId, e.contentUTF8());
            telegramClient.sendMessage(SendMessageRequest.builder()
                    .chatId(chatId)
                    .text(html.replaceAll("<[^>]+>", "")
                            .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&"))
                    .build());
        }
    }

    /**
     * Cuts the report into messages within Telegram's limit, at line ends so no tag is cut in half.
     */
    static List<String> split(String message) {
        List<String> parts = new ArrayList<>();
        StringBuilder part = new StringBuilder();
        for (String line : message.split("\n", -1)) {
            if (part.length() > 0 && part.length() + line.length() + 1 > MESSAGE_LIMIT) {
                parts.add(part.toString());
                part.setLength(0);
            }
            if (part.length() > 0) {
                part.append('\n');
            }
            part.append(line);
        }
        if (!part.toString().isBlank()) {
            parts.add(part.toString());
        }
        return parts;
    }
}
