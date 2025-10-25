package org.proteus1121.mqtt.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.enums.TopicType;

@Slf4j
public abstract class Publisher<T> {

    protected static final String TOPIC_TEMPLATE = "users/%d/devices/%d/%s";

    private MessagePublisher publisher;
    private ObjectMapper objectMapper;
    
    protected String getTopic(Topic topic) {
        return TOPIC_TEMPLATE.formatted(topic.getUserId(), topic.getDeviceId(), topic.getType().getValue());
    }
    
    protected abstract TopicType getTopicType();

    public void publish(Long userId, Long deviceId, DeviceConfiguration configuration) {
        try {
            String message = objectMapper.writeValueAsString(configuration);
            String topic = getTopic(new Topic(userId, deviceId, getTopicType()));
            log.debug("Publishing configuration to topic: {}, configuration: {}", topic, message);
            publisher.publishMessage(topic, message);
        } catch (Exception e) {
            log.error("Failed to publish configuration for userId: {}, deviceId: {}", userId, deviceId, e);
        }
    }
}
