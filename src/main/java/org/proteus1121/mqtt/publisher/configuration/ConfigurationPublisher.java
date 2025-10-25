package org.proteus1121.mqtt.publisher.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.publisher.MessagePublisher;
import org.proteus1121.mqtt.publisher.Publisher;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConfigurationPublisher extends Publisher<DeviceConfiguration> {

    private MessagePublisher publisher;
    private ObjectMapper objectMapper;

    protected TopicType getTopicType() {
        return TopicType.CONFIGURATION;
    }
}
