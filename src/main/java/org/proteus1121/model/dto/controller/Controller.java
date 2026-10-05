package org.proteus1121.model.dto.controller;

import org.proteus1121.model.enums.BoardModel;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.DisplayLanguage;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Controller {

    private Long id;
    private Long userId;
    /**
     * Access of the current user: OWNER for own boards, EDITOR / VIEWER for boards shared with them.
     */
    private DeviceRole role;
    private String hardwareId;
    private String name;
    private String platform;
    private String board;
    /**
     * Development board the chip sits on, for the diagram; the platform default until the user picks one.
     */
    private BoardModel boardModel;
    private String firmwareVersion;
    private String ipAddress;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime lastSeen;
    private boolean online;
    /**
     * true when the board reported the same configuration version the server would send now.
     */
    private boolean synced;
    private int deviceCount;
    private DisplaySettings display;
    /**
     * Language of the screens on the display.
     */
    private DisplayLanguage displayLanguage;
    /**
     * false when the board did not find the configured display (wiring or model), null when unknown.
     */
    private Boolean displayFound;
    /**
     * ESP32-CAM: false when its camera did not start (ribbon cable, PSRAM), null on other boards.
     */
    private Boolean cameraFound;
    /**
     * Newer firmware published for this board, null when it runs the latest.
     */
    private String availableFirmware;
    /**
     * Firmware update in progress (or failed), null when none.
     */
    private FirmwareUpdateStatus firmwareUpdate;
}
