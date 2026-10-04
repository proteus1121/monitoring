package org.proteus1121.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Login to the MQTT broker, checked by mosquitto-go-auth straight from this table (mosquitto/config): a board
 * gets one when it is linked on the site (username = hardware id, topics users/{userId}/# only), the backend
 * has a superuser one.
 */
@Data
@Entity
@Table(name = "mqtt_accounts")
@NoArgsConstructor
public class MqttAccountEntity {

    @Id
    @Column(length = 64)
    private String username;

    // bcrypt, the plain password is only given to the board once
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // owner of the board; null for the service account
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private boolean superuser;

    public MqttAccountEntity(String username, String passwordHash, Long userId, boolean superuser) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.userId = userId;
        this.superuser = superuser;
    }
}
