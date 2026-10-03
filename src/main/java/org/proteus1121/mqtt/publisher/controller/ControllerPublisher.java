package org.proteus1121.mqtt.publisher.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.ControllerConfiguration;
import org.proteus1121.mqtt.publisher.MessagePublisher;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Slf4j
@Component
@RequiredArgsConstructor
public class ControllerPublisher {

    private static final String CONFIGURATION_TOPIC = "users/%d/controllers/%s/configuration";
    private static final String COMMAND_TOPIC = "users/%d/devices/%d/command";
    private static final String PAIRING_TOPIC = "pairing/%s/%s";
    private static final String SCAN_TOPIC = "users/%d/controllers/%s/scan";

    private final MessagePublisher publisher;
    private final ObjectMapper objectMapper;

    public void publishConfiguration(Long userId, String hardwareId, ControllerConfiguration configuration) {
        String topic = CONFIGURATION_TOPIC.formatted(userId, hardwareId);
        try {
            String payload = objectMapper.writeValueAsString(configuration);
            log.info("Publishing controller configuration to {}: {}", topic, payload);
            publisher.publishMessage(topic, payload, true);
        } catch (Exception e) {
            log.error("Failed to publish controller configuration to {}", topic, e);
        }
    }

    /**
     * Removes the retained configuration so a deleted controller does not get it again.
     */
    public void clearConfiguration(Long userId, String hardwareId) {
        String topic = CONFIGURATION_TOPIC.formatted(userId, hardwareId);
        try {
            publisher.publishMessage(topic, "", true);
        } catch (Exception e) {
            log.error("Failed to clear controller configuration on {}", topic, e);
        }
    }

    /**
     * Retained so a board that is offline while it is deleted unlinks itself when it comes back. Pairing the
     * board again publishes a configuration over it.
     */
    public void publishUnpair(Long userId, String hardwareId) {
        String topic = CONFIGURATION_TOPIC.formatted(userId, hardwareId);
        try {
            publisher.publishMessage(topic, "{\"unpair\":true}", true);
        } catch (Exception e) {
            log.error("Failed to unpair controller on {}", topic, e);
        }
    }

    /**
     * Not retained: an old request must not start a scan when the board reconnects.
     */
    public void publishScanRequest(Long userId, String hardwareId, String requestId) {
        String topic = SCAN_TOPIC.formatted(userId, hardwareId);
        log.info("Publishing scan request to {}", topic);
        publisher.publishMessage(topic, "{\"id\":\"%s\"}".formatted(requestId), false);
    }

    /**
     * Not retained: a board only listens while it waits for pairing, an old result must not pair it again.
     */
    public void publishPairing(String hardwareId, String subtopic, String payload) {
        String topic = PAIRING_TOPIC.formatted(hardwareId, subtopic);
        log.info("Publishing pairing {} to {}", subtopic, topic);
        publisher.publishMessage(topic, payload, false);
    }

    /**
     * Command is retained so the board restores the last requested state after a reboot.
     */
    public void publishCommand(Long userId, Long deviceId, double value) {
        String topic = COMMAND_TOPIC.formatted(userId, deviceId);
        String payload = BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
        log.info("Publishing command to {}: {}", topic, payload);
        publisher.publishMessage(topic, payload, true);
    }
}
