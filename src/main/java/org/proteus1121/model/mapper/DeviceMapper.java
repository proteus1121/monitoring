package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.request.DeviceRequest;

@Mapper(componentModel = "spring")
public interface DeviceMapper {

    @Mapping(source = "user.id", target = "userId")
    Device toDevice(DeviceEntity deviceEntity);

    @Mapping(target = "userId", ignore = true) // User will be set separately in the service
    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "lastChecked", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "status", constant = "OFFLINE")
    Device toDevice(DeviceRequest deviceRequest);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "user.id", source = "userId")
    DeviceEntity toDeviceEntity(Device device, Long userId);

    @Mapping(target = "user.id", source = "device.userId")
    @Mapping(target = "id", source = "id") // ID will be auto-generated
    @Mapping(target = "user.id", source = "userId")
    DeviceEntity toDeviceEntity(Long id, Device device);
    
    DeviceConfiguration toDeviceConfiguration(Device device);

}
