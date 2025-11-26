package org.proteus1121.model.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.dto.user.UserDevices;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.request.DeviceRequest;

import java.util.Set;

@Mapper(componentModel = "spring", uses = { UserMapper.class, UserDeviceMapper.class })
public interface DeviceMapper {

    @Named("toPlainDevice")
    @Mapping(target = "userDevices", qualifiedByName = "toDeviceUser")
    Device toDevice(DeviceEntity deviceEntity);
    
    @Mapping(target = "userDevices", source = "userDevices")
    Device toDevice(DeviceEntity deviceEntity, Set<UserDevices> userDevices);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "lastChecked", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "status", constant = "OFFLINE")
    Device toDevice(DeviceRequest deviceRequest);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "userDevices", ignore = true) // UserDevices will be set separately in the service
    @Mapping(target = "name", source = "device.name")
    DeviceEntity toDeviceEntity(Device device);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "userDevices", ignore = true)
    @Mapping(target = "name", source = "device.name")
    DeviceEntity toDeviceEntity(Long id, Device device);
    
    DeviceConfiguration toDeviceConfiguration(Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void toDevice(DeviceRequest deviceRequest, @MappingTarget Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "userDevices", ignore = true)
    void toDevice(Device device, @MappingTarget DeviceEntity deviceEntity);

}
