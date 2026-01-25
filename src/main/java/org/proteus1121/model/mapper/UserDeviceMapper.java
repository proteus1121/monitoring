package org.proteus1121.model.mapper;

import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.proteus1121.model.dto.user.DeviceUser;
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
    @Mapping(target = "deviceId", source = "deviceId")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "username", source = "user.name")
    @Mapping(target = "deviceName", source = "device.name")
    @Mapping(target = "role", source = "role")
    DeviceUser toDeviceUser(UserDeviceEntity link);

    /**
     * Convert UserDeviceEntity to DeviceUser DTO, with deviceName from context.
     */
    @Named("toDeviceUserWithDeviceName")
    default DeviceUser toDeviceUserWithDeviceName(UserDeviceEntity link, @Context String deviceName) {
        DeviceUser dto = toDeviceUser(link);
        dto.setDeviceName(deviceName);
        return dto;
    }
}
