package org.proteus1121.model.dto.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import org.proteus1121.model.enums.DeviceRole;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

public record ControllerShare(@Schema(requiredMode = REQUIRED) Long controllerId,
                              String controllerName,
                              @Schema(requiredMode = REQUIRED) Long userId,
                              @Schema(requiredMode = REQUIRED) String username,
                              @Schema(requiredMode = REQUIRED) DeviceRole role) {
}
