package org.proteus1121.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.mqtt.Topic;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class TopicMessageHandler implements MessageHandler {

    private final List<Consumer> consumers;
    
    @Override
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);

        consumers.forEach(consumer -> {
            Optional<Topic> topicInfo = consumer.parseTopic(topic);
            if (topicInfo.isPresent()) {
                String payload = String.valueOf(message.getPayload());
                consumer.processMessage(topicInfo.get(), payload);
            }
        });
    }
}