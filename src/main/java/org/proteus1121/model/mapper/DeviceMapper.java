package org.proteus1121.model.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.request.DeviceRequest;

@Mapper(componentModel = "spring", uses = { UserMapper.class })
public interface DeviceMapper {

    @Named("toPlainDevice")
    @Mapping(target = "user", source = "user", qualifiedByName = "toPlainUser")
    Device toDevice(DeviceEntity deviceEntity);

    @Mapping(target = "user", ignore = true) // User will be set separately in the service
    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "lastChecked", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "status", constant = "OFFLINE")
    Device toDevice(DeviceRequest deviceRequest);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "user", source = "user")
    @Mapping(target = "name", source = "device.name")
    DeviceEntity toDeviceEntity(Device device, UserEntity user);

    @Mapping(target = "user.id", source = "device.user.id")
    @Mapping(target = "id", source = "id") // ID will be auto-generated
    DeviceEntity toDeviceEntity(Long id, Device device);
    
    DeviceConfiguration toDeviceConfiguration(Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void toDevice(DeviceRequest deviceRequest, @MappingTarget Device device);
}
