package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.entity.SensorDataEntity;

@Mapper(componentModel = "spring")
public interface SensorDataMapper {

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "device.id", source = "deviceId")
    @Mapping(target = "timestamp", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "value", source = "value")
    SensorDataEntity toSensorDataEntity(Double value, Long deviceId);
}
