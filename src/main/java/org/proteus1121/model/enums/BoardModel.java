package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Which development board the chip sits on: the firmware cannot tell a NodeMCU from a D1 mini (both ESP8266),
 * so the user picks it on the site and the board's diagram follows it.
 */
@Getter
@RequiredArgsConstructor
public enum BoardModel {

    NODEMCU("NodeMCU v2", "esp8266"),
    D1_MINI("Wemos D1 mini", "esp8266"),
    ESP32_DEVKIT("ESP32 DevKit", "esp32");

    private final String label;
    private final String platform;

    /**
     * The board assumed until the user picks one.
     */
    public static BoardModel defaultFor(String platform) {
        return "esp8266".equalsIgnoreCase(platform) ? NODEMCU : ESP32_DEVKIT;
    }

    public boolean fits(String platform) {
        return this.platform.equalsIgnoreCase(platform == null ? "esp32" : platform);
    }
}
