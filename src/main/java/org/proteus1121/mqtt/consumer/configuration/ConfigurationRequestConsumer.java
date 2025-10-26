package org.proteus1121.mqtt.consumer.configuration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.mqtt.publisher.configuration.ConfigurationPublisher;
import org.proteus1121.service.DeviceService;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.proteus1121.model.enums.ActionType;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConfigurationRequestConsumer implements Consumer {

    static final Pattern USER_TOPIC_PATTERN = Pattern.compile(
            "^/?users/(?<userId>\\d+)/(?<type>" + TOPIC_TYPES + ")/(?<action>" + ACTION_TYPES + ")$",
            Pattern.CASE_INSENSITIVE
    );

    private final DeviceService deviceService;
    private final ConfigurationPublisher configurationPublisher;
    private final DeviceMapper deviceMapper;

    @Override
    public Optional<Topic> parseTopic(String topic) {
        if (topic == null) {
            log.error("Topic is null");
            return Optional.empty();
        }

        Matcher m = USER_TOPIC_PATTERN.matcher(topic);
        if (!m.matches()) {
            return Optional.empty();
        }

        Long userId = Long.parseLong(m.group("userId"));

        String typeStr = m.group("type");
        var topicType = TopicType.parse(typeStr);
        if (topicType.isEmpty()) {
            log.warn("Unknown topic type: {}", typeStr);
            return Optional.empty();
        }

        String actionStr = m.group("action");
        ActionType action = ActionType.parse(actionStr);
        return Optional.of(new Topic(userId, null, topicType.get(), action));
    }

    @Override
    public void processMessage(Topic topic, String message) {
        log.debug("Processing message for topic: {}, message: {}", topic, message);
        if ("get".equals(message)) {
            Long userId = topic.getUserId();
            log.info("Received configuration request from device: {}, user: {}", topic.getDeviceId(), userId);
            deviceService.getAllDevices(userId).forEach(device -> {
                        DeviceConfiguration deviceConfiguration = deviceMapper.toDeviceConfiguration(device);
                        configurationPublisher.publish(userId, device.getId(), deviceConfiguration);
                    }
            );
        }
    }
}