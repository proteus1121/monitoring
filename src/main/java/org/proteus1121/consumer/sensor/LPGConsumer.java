package org.proteus1121.consumer.sensor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.consumer.MeasurementConsumer;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LPGConsumer implements MeasurementConsumer {

    private final SensorDataRepository sensorDataRepository;
    private final SensorDataMapper sensorDataMapper;
    
    @Override
    public String getTopic() {
        return DeviceType.LPG.getTopic();
    }

    @Override
    public void processMessage(String message) {
        log.debug("LPGConsumer: {}", message);
        double value = Double.parseDouble(message);
        sensorDataRepository.save(sensorDataMapper.toSensorDataEntity(value, 3L));
    }
}
