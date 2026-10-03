package org.proteus1121.mqtt.consumer.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.ControllerHello;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.service.ControllerService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles users/{userId}/controllers/{hardwareId}/hello sent by boards after they connect.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ControllerConsumer implements Consumer {

    static final Pattern CONTROLLER_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/controllers/(?<hardwareId>[A-Za-z0-9_-]{1,64})/hello$"
    );

    private final ControllerService controllerService;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<Topic> parseTopic(String topic) {
        if (topic == null) {
            return Optional.empty();
        }

        Matcher m = CONTROLLER_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            return Optional.empty();
        }

        Long userId = Long.parseLong(m.group("userId"));
        return Optional.of(new Topic(userId, null, TopicType.CONFIGURATION, ActionType.REQUEST, m.group("hardwareId")));
    }

    @Override
    public void processMessage(Topic topic, String message) throws Exception {
        ControllerHello hello = message == null || message.isBlank()
                ? new ControllerHello(null, null, null, null, null)
                : objectMapper.readValue(message, ControllerHello.class);
        log.debug("Controller {} of user {} says hello: {}", topic.getHardwareId(), topic.getUserId(), hello);
        controllerService.handleHello(topic.getUserId(), topic.getHardwareId(), hello);
    }
}
