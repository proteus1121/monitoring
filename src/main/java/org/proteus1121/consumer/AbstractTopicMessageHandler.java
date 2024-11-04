package org.proteus1121.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;

@Slf4j
public abstract class AbstractTopicMessageHandler implements MessageHandler {

    @Override
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        if (getTopic().equals(topic)) {
            String payload = String.valueOf(message.getPayload());
            processMessage(payload);
        }
    }

    protected abstract String getTopic();

    protected abstract void processMessage(String message);

}