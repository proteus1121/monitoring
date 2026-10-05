package org.proteus1121.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "users")
@NoArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String password;

    /**
     * IANA zone of the user (Europe/Kyiv), sent by the browser; notifications show times in it. Null until the
     * user opened the site with this version.
     */
    @Column(name = "time_zone", length = 64)
    private String timeZone;

    /**
     * SSO provider (google, github) and the user's id there; null for users with a password.
     * Identity is matched by these, never by name, so a local account cannot be taken over via SSO.
     */
    @Column(name = "auth_provider", length = 32)
    private String authProvider;

    @Column(name = "auth_subject", length = 255)
    private String authSubject;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<UserDeviceEntity> userDevices = new HashSet<>();

    public UserEntity(String username, String encodedPassword) {
        this.name = username;
        this.password = encodedPassword;
    }
}
