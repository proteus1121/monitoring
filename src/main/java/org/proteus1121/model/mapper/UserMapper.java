package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserEntity;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", source = "userEntity.id")
    @Mapping(target = "username", source = "userEntity.name")
    @Mapping(target = "authorities", source = "authorities")
    User toUser(UserEntity userEntity, List<GrantedAuthority> authorities);

}
