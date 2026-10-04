package org.proteus1121.model.dto.controller;

/**
 * What the site hands to the board through the browser after linking it: the account it belongs to and its own
 * MQTT login. The password is only returned here, the server keeps a hash.
 */
public record BoardConnection(Controller controller,
                              Long userId,
                              String mqttUsername,
                              String mqttPassword,
                              String mqttHost,
                              int mqttPort) {
}
