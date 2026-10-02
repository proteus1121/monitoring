package org.proteus1121.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Physical board (ESP32 / ESP8266) that registers itself over MQTT and receives configuration
 * of the devices (sensors and actuators) wired to it.
 */
@Data
@Entity
@Table(name = "controllers")
@NoArgsConstructor
public class ControllerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "hardware_id", nullable = false, unique = true, length = 64)
    private String hardwareId;

    private String name;

    @Column(length = 32)
    private String platform;

    @Column(length = 32)
    private String firmwareVersion;

    @Column(length = 64)
    private String ipAddress;

    /**
     * Version of the configuration the board reported as applied.
     */
    @Column(length = 16)
    private String appliedConfigVersion;

    private LocalDateTime lastSeen;

    private LocalDateTime created = LocalDateTime.now();
}
