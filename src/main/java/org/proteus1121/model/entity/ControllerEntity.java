package org.proteus1121.model.entity;

import org.proteus1121.model.enums.BoardModel;
import org.proteus1121.model.enums.DisplayLanguage;
import org.proteus1121.model.enums.DisplayModel;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
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

    /**
     * Firmware build the board runs (platformio env, e.g. esp8266, esp32dev); picks the update file.
     */
    @Column(length = 32)
    private String board;

    /**
     * Development board picked by the user, null until then (BoardModel.defaultFor the platform).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "board_model", columnDefinition = "VARCHAR(16)")
    private BoardModel boardModel;

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

    /**
     * Display wired to the board, null until configured on the site: then the platform default is used,
     * see DisplaySettings.defaultFor.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "display_model", columnDefinition = "VARCHAR(16)")
    private DisplayModel displayModel;

    /**
     * GPIO numbers of the display, comma separated in the order of the model's pin names.
     */
    @Column(name = "display_pins", length = 64)
    private String displayPins;

    @Column(name = "display_flip")
    private Boolean displayFlip;

    /**
     * Language of the display screens, null until chosen on the site (Ukrainian then).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "display_language", columnDefinition = "VARCHAR(4)")
    private DisplayLanguage displayLanguage;

    /**
     * Whether the board found the display at its last hello, null when the firmware does not report it.
     */
    @Column(name = "display_found")
    private Boolean displayFound;

    private LocalDateTime created = LocalDateTime.now();
}
