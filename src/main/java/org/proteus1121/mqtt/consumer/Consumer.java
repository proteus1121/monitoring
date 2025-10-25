package org.proteus1121.mqtt.consumer;

import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.TopicType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public interface Consumer {

    Logger log = LoggerFactory.getLogger(Consumer.class);
    
    String TOPIC_TYPES = Arrays.stream(TopicType.values())
            .map(TopicType::getValue)
            .map(Pattern::quote)
            .collect(Collectors.joining("|"));

    Pattern TOPIC_PATTERN =
            Pattern.compile("^/?users/(\\d+)/devices/(\\d+)/(" + TOPIC_TYPES + ")/?$", Pattern.CASE_INSENSITIVE);

    default Optional<Topic> parseTopic(String topic) {

        if (topic == null) {
            log.error("Topic is null");
            return Optional.empty();
        }

        Matcher m = TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            log.warn("Invalid topic format: {}", topic);
            return Optional.empty();
        }

        Long userId = Long.parseLong(m.group(1));
        Long deviceId = Long.parseLong(m.group(2));
        String type = m.group(3);
        Optional<TopicType> topicType = TopicType.parse(type);
        if (topicType.isEmpty()) {
            log.warn("Unknown topic type: {}", type);
            return Optional.empty();
        }

        return Optional.of(new Topic(userId, deviceId, topicType.get()));
    }

    void processMessage(Topic topic, String message);
}
