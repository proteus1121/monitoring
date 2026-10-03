package org.proteus1121.mqtt.consumer.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.service.BoardScanService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles users/{userId}/controllers/{hardwareId}/scan-result: modules a board found on its free pins.
 */
@Component
@RequiredArgsConstructor
public class ScanResultConsumer implements Consumer {

    static final Pattern SCAN_RESULT_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/controllers/(?<hardwareId>[A-Za-z0-9_-]{1,64})/scan-result$");

    private final BoardScanService boardScanService;

    @Override
    public Optional<Topic> parseTopic(String topic) {
        if (topic == null) {
            return Optional.empty();
        }
        Matcher m = SCAN_RESULT_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            return Optional.empty();
        }
        return Optional.of(new Topic(Long.parseLong(m.group("userId")), null, TopicType.CONFIGURATION,
                ActionType.REQUEST, m.group("hardwareId")));
    }

    @Override
    public void processMessage(Topic topic, String message) {
        boardScanService.handleResult(topic.getUserId(), topic.getHardwareId(), message);
    }
}
