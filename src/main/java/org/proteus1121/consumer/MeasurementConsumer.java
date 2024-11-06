package org.proteus1121.consumer;

public interface MeasurementConsumer {

    String getTopic();

    void processMessage(String message);
}
