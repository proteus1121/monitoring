package org.proteus1121.mqtt.consumer.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.service.PairingService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles pairing/{hardwareId}/request from boards that have no account yet.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PairingConsumer implements Consumer {

    static final Pattern PAIRING_TOPIC_PATTERN = Pattern.compile(
            "^/?pairing/(?<hardwareId>[A-Za-z0-9_-]{1,64})/request$");

    private final PairingService pairingService;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<Topic> parseTopic(String topic) {
        if (topic == null) {
            return Optional.empty();
        }
        Matcher m = PAIRING_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            return Optional.empty();
        }
        return Optional.of(new Topic(null, null, TopicType.CONFIGURATION, ActionType.REQUEST, m.group("hardwareId")));
    }

    @Override
    public void processMessage(Topic topic, String message) throws Exception {
        JsonNode payload = message == null || message.isBlank() ? null : objectMapper.readTree(message);
        String platform = payload == null ? null : payload.path("platform").asText(null);
        String firmware = payload == null ? null : payload.path("fw").asText(null);
        pairingService.requestCode(topic.getHardwareId(), platform, firmware);
    }
}
