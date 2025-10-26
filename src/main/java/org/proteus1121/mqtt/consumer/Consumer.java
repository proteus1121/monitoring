package org.proteus1121.mqtt.consumer;

import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public interface Consumer {

    String TOPIC_TYPES = Arrays.stream(TopicType.values())
            .map(TopicType::getValue)
            .map(Pattern::quote)
            .collect(Collectors.joining("|"));

    String ACTION_TYPES = Arrays.stream(ActionType.values())
            .map(ActionType::getValue)
            .map(Pattern::quote)
            .collect(Collectors.joining("|"));

    Optional<Topic> parseTopic(String topic);

    void processMessage(Topic topic, String message);
}