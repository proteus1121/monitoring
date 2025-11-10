package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.model.entity.UserEntity;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", source = "userEntity.id")
    @Mapping(target = "username", source = "userEntity.name")
    @Mapping(
            target = "authorities",
            expression = "java(authorities == null ? java.util.Collections.emptyList() : authorities)"
    )
    User toUser(UserEntity userEntity, List<GrantedAuthority> authorities);

    @Named("toPlainUser")
    default User toPlainUser(UserEntity userEntity) {
        return toUser(userEntity, java.util.Collections.emptyList());
    }

}
