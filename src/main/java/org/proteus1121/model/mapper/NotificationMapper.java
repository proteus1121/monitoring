package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.dto.notification.TelegramNotification;
import org.proteus1121.model.entity.NotificationEntity;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(source = "user.id", target = "userId")
    TelegramNotification toTelegramNotification(NotificationEntity entity);

    @Mapping(target = "id", ignore = true) // ID will be auto-generated
    @Mapping(target = "user.id", source = "userId")
    NotificationEntity toEntity(TelegramNotification device, Long userId);

    @Mapping(target = "user.id", source = "notification.userId")
    @Mapping(target = "id", source = "id") // ID will be auto-generated
    NotificationEntity toEntity(Long id, TelegramNotification notification);
    
}
