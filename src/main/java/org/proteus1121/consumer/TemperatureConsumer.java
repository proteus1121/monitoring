package org.proteus1121.consumer;

import org.springframework.stereotype.Component;

@Component
public class TemperatureConsumer implements MeasurementConsumer {

    @Override
    public String getTopic() {
        return "thermometer/temperature";
    }

    @Override
    public void processMessage(String message) {
        System.out.println("TemperatureConsumer: " + message);
    }
}
