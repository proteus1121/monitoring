package org.proteus1121.model.dto.controller;

import org.proteus1121.model.enums.DeviceRole;

public record ControllerShare(Long controllerId, String controllerName, Long userId, String username, DeviceRole role) {
}
