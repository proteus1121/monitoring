package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.proteus1121.model.dto.user.UserDevices;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.enums.DeviceRole;

@Mapper(componentModel = "spring")
public interface UserDeviceMapper {

    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "deviceId", source = "deviceId")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "device", ignore = true)
    @Mapping(target = "role", source = "role")
    UserDeviceEntity toLinkByIds(Long userId, Long deviceId, DeviceRole role);

    /**
     * Convert UserDeviceEntity to DeviceUser DTO.
     */
    @Named("toDeviceUser")
    @Mapping(target = "id", source = "user.id")
    @Mapping(target = "username", source = "user.name")
    @Mapping(target = "role", source = "role")
    UserDevices toDeviceUser(UserDeviceEntity link);

}
