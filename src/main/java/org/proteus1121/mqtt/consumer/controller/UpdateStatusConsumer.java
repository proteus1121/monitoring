package org.proteus1121.mqtt.consumer.controller;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.service.FirmwareService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles users/{userId}/controllers/{hardwareId}/update-status: progress of a firmware update.
 */
@Component
@RequiredArgsConstructor
public class UpdateStatusConsumer implements Consumer {

    static final Pattern UPDATE_STATUS_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/controllers/(?<hardwareId>[A-Za-z0-9_-]{1,64})/update-status$");

    private final FirmwareService firmwareService;

    @Override
    public Optional<Topic> parseTopic(String topic) {
        if (topic == null) {
            return Optional.empty();
        }
        Matcher m = UPDATE_STATUS_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            return Optional.empty();
        }
        return Optional.of(new Topic(Long.parseLong(m.group("userId")), null, TopicType.CONFIGURATION,
                ActionType.REQUEST, m.group("hardwareId")));
    }

    @Override
    public void processMessage(Topic topic, String message) {
        firmwareService.handleStatus(topic.getUserId(), topic.getHardwareId(), message);
    }
}
