package org.proteus1121.mqtt.consumer.sensor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.mqtt.consumer.Consumer;
import org.proteus1121.model.dto.mqtt.Topic;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeasurementsConsumer implements Consumer {

    private final SensorDataRepository sensorDataRepository;
    private final SensorDataMapper sensorDataMapper;
    
    @Override
    public void processMessage(Topic topic, String message) {
        log.debug("Processing message for topic: {}, message: {}", topic, message);
        double value = Double.parseDouble(message);
        sensorDataRepository.save(sensorDataMapper.toSensorDataEntity(value, topic.getDeviceId()));
    }
}