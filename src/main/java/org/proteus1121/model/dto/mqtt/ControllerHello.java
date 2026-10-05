package org.proteus1121.model.dto.mqtt;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Announcement sent by a board on users/{userId}/controllers/{hardwareId}/hello after connecting and periodically.
 *
 * @param v    configuration version currently applied on the board
 * @param disp  whether the configured display answered, null from firmware before 2.2
 * @param board firmware build (platformio env, e.g. esp32dev), null from firmware before 2.4
 * @param cam   whether the camera of an ESP32-CAM answered, null on other boards
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ControllerHello(String platform, String fw, String ip, String v, Boolean disp, String board, Boolean cam) {
}
