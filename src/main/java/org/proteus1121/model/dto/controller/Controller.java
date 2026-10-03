package org.proteus1121.model.dto.controller;

import org.proteus1121.model.enums.DeviceRole;
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
}
