package org.proteus1121.mqtt.publisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MessagePublisher {

    private final MessageChannel mqttOutboundChannel;

    @ServiceActivator(outputChannel = "mqttOutboundChannel")
    public void publishMessage(String topic, String payload) {
        publishMessage(topic, payload, false);
    }

    /**
     * @param retained broker keeps the last message so a board gets it right after (re)subscribing
     */
    public void publishMessage(String topic, String payload, boolean retained) {
        Message<String> message = MessageBuilder.withPayload(payload)
                .setHeader(MqttHeaders.TOPIC, topic)
                .setHeader(MqttHeaders.RETAINED, retained)
                .setHeader(MqttHeaders.QOS, retained ? 1 : 0)
                .build();
        mqttOutboundChannel.send(message);
    }
}
