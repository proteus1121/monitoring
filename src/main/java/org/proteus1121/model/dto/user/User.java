package org.proteus1121.model.dto.user;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;

@Getter
public class User extends org.springframework.security.core.userdetails.User implements Serializable {

    @Serial
    private static final long serialVersionUID = 7071983277933053820L;

    private final Long id;
    
    public User(Long id, String username, String password,
                Collection<? extends GrantedAuthority> authorities) {
        super(username, password, authorities);
        this.id = id;
    }
}
