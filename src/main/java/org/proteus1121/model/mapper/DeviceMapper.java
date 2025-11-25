package org.proteus1121.model.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.mqtt.DeviceConfiguration;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.request.DeviceRequest;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring", uses = { UserMapper.class, UserDeviceMapper.class })
public interface DeviceMapper {

    @Named("toPlainDevice")
    Device toDevice(DeviceEntity deviceEntity);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "lastChecked", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "status", constant = "OFFLINE")
    Device toDevice(DeviceRequest deviceRequest);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "userDevices", ignore = true) // UserDevices will be set separately in the service
    @Mapping(target = "name", source = "device.name")
    DeviceEntity toDeviceEntity(Device device);

    @Mapping(target = "id", source = "id") // ID will be auto-generated
    DeviceEntity toDeviceEntity(Long id, Device device);
    
    DeviceConfiguration toDeviceConfiguration(Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void toDevice(DeviceRequest deviceRequest, @MappingTarget Device device);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void toDevice(Device device, @MappingTarget DeviceEntity deviceEntity);

    @Named("toDeviceUserListFromIds")
    default List<DeviceUser> toDeviceUserListFromIds(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return null; // or Collections.emptyList() if you prefer
        }
        return userIds.stream()
                .map(id -> {
                    DeviceUser dto = new DeviceUser();
                    dto.setId(id);
                    // Optionally set default role if needed:
                    // dto.setRole(DeviceRole.VIEWER);
                    return dto;
                })
                .toList();
    }
}
