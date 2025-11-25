package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.DeviceRole;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserDeviceMapper {

    /**
     * Create a link using full entities.
     */
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "deviceId", source = "device.id")
    @Mapping(target = "user", source = "user")
    @Mapping(target = "device", source = "device")
    @Mapping(target = "role", source = "role")
    UserDeviceEntity toLink(UserEntity user, DeviceEntity device, DeviceRole role);

    /**
     * Convert UserDeviceEntity to DeviceUser DTO.
     */
    @Named("toDeviceUser")
    @Mapping(target = "id", source = "user.id")
    @Mapping(target = "username", source = "user.name")
    @Mapping(target = "role", source = "role")
    DeviceUser toDeviceUser(UserDeviceEntity link);

    /**
     * Convert a Set of UserDeviceEntity to a List of DeviceUser DTOs.
     */
    @Named("toDeviceUserList")
    default List<DeviceUser> toDeviceUserList(Set<UserDeviceEntity> links) {
        if (links == null || links.isEmpty()) return List.of();
        return links.stream().map(this::toDeviceUser).collect(Collectors.toList());
    }
}
