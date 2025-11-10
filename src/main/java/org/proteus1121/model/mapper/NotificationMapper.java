package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.entity.NotificationEntity;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.request.DeviceRequest;
import org.proteus1121.model.request.TelegramNotificationRequest;

@Mapper(componentModel = "spring", uses = { UserMapper.class })
public interface NotificationMapper {

    @Mapping(target = "user", source = "user", qualifiedByName = "toPlainUser")
    TelegramNotification toTelegramNotification(NotificationEntity entity);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "user", source = "user")
    NotificationEntity toEntity(TelegramNotification device, UserEntity user);

    @Mapping(target = "user.id", source = "notification.user.id")
    @Mapping(target = "id", source = "id") // ID will be auto-generated
    NotificationEntity toEntity(Long id, TelegramNotification notification);

    @Mapping(target = "user", ignore = true) // User will be set separately in the service
    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    TelegramNotification toTelegramNotification(TelegramNotificationRequest request);
    
}
