package org.proteus1121.model.dto.controller;

import io.swagger.v3.oas.annotations.media.Schema;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * What the site hands to the board through the browser after linking it: the account it belongs to and its own
 * MQTT login. The password is only returned here, the server keeps a hash.
 */
public record BoardConnection(@Schema(requiredMode = REQUIRED) Controller controller,
                              @Schema(requiredMode = REQUIRED) Long userId,
                              @Schema(requiredMode = REQUIRED) String mqttUsername,
                              @Schema(requiredMode = REQUIRED) String mqttPassword,
                              @Schema(requiredMode = REQUIRED) String mqttHost,
                              @Schema(requiredMode = REQUIRED) int mqttPort) {
}
