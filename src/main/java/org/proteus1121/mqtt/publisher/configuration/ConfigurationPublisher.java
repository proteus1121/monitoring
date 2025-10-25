package org.proteus1121.mqtt.publisher.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.enums.TopicType;
import org.proteus1121.mqtt.publisher.MessagePublisher;
import org.proteus1121.mqtt.publisher.Publisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ConfigurationPublisher extends Publisher<DeviceConfiguration> {

    @Autowired
    public ConfigurationPublisher(MessagePublisher publisher, ObjectMapper objectMapper) {
        super(publisher, objectMapper);
    }

    protected TopicType getTopicType() {
        return TopicType.CONFIGURATION;
    }
}
