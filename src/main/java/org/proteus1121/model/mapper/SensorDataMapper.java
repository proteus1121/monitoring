package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.response.metric.SensorData;

import java.time.LocalDateTime;

@Mapper(componentModel = "spring")
public interface SensorDataMapper {

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "device.id", source = "deviceId")
    @Mapping(target = "timestamp", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "value", source = "value")
    SensorDataEntity toSensorDataEntity(Double value, Long deviceId);

    @Mapping(target = "timestamp", source = "timestamp")
    @Mapping(target = "value", source = "value")
    SensorData toSensorData(SensorDataEntity sensorDataEntity);

    @Mapping(target = "timestamp", source = "timestamp")
    @Mapping(target = "value", source = "value")
    SensorData toSensorData(PredictedSensorDataEntity sensorDataEntity);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "device.id", source = "deviceId")
    @Mapping(target = "timestamp", source = "timestamp")
    @Mapping(target = "value", source = "value")
    PredictedSensorDataEntity toPredictedSensorDataEntity(Double value, Long deviceId, LocalDateTime timestamp);
}
