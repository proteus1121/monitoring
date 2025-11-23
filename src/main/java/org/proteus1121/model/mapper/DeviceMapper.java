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

import java.util.Set;

@Mapper(componentModel = "spring", uses = { UserMapper.class })
public interface DeviceMapper {

    @Named("toPlainDevice")
    @Mapping(target = "users", source = "users", qualifiedByName = "toPlainUser")
    Device toDevice(DeviceEntity deviceEntity);

    @Mapping(target = "users", ignore = true) // User will be set separately in the service
    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "lastChecked", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "status", constant = "OFFLINE")
    Device toDevice(DeviceRequest deviceRequest);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "users", expression = "java(java.util.Set.of(user))")
    @Mapping(target = "name", source = "device.name")
    DeviceEntity toDeviceEntity(Device device, UserEntity user);

    @Mapping(target = "users", source = "users")
    @Mapping(target = "id", source = "id") // ID will be auto-generated
    DeviceEntity toDeviceEntity(Long id, Device device, Set<UserEntity> users);
    
    DeviceConfiguration toDeviceConfiguration(Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void toDevice(DeviceRequest deviceRequest, @MappingTarget Device device);
}
