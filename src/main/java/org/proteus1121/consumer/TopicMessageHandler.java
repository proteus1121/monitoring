package org.proteus1121.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TopicMessageHandler implements MessageHandler {

    private final List<MeasurementConsumer> consumers;
    
    @Override
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        consumers.stream()
                .filter(consumer -> consumer.getTopic().equals(topic))
                .forEach(consumer -> {
                    String payload = String.valueOf(message.getPayload());
                    consumer.processMessage(payload);
                });
    }
}