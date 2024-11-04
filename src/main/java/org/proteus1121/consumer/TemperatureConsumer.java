package org.proteus1121.consumer;

import org.springframework.stereotype.Component;

@Component
public class TemperatureConsumer extends AbstractTopicMessageHandler {

    @Override
    public String getTopic() {
        return "thermometer/temperature";
    }

    @Override
    protected void processMessage(String message) {
        // Process the message
    }
}
