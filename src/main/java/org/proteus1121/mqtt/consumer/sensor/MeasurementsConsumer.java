package org.proteus1121.mqtt.consumer.sensor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.enums.ActionType;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.service.MetricService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeasurementsConsumer implements Consumer {

    static final Pattern DEVICE_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/devices/(?<deviceId>\\d+)/(?<type>" + TOPIC_TYPES + ")(?:/(?<action>" + ACTION_TYPES + "))?$",
            Pattern.CASE_INSENSITIVE
    );

    private final MetricService metricService;

    @Override
    public Optional<Topic> parseTopic(String topic) {

        if (topic == null) {
            log.error("Topic is null");
            return Optional.empty();
        }

        Matcher m = DEVICE_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
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

        return Optional.of(new Topic(userId, deviceId, topicType.get(), ActionType.DATA));
    }

    @Override
    public void processMessage(Topic topic, String message) {
        log.debug("Processing message for topic: {}, message: {}", topic, message);
        double value = Double.parseDouble(message);
        metricService.processMetrics(topic.getDeviceId(), value);
    }
}