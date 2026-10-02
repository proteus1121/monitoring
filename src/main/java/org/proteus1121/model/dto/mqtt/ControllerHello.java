package org.proteus1121.model.dto.mqtt;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Announcement sent by a board on users/{userId}/controllers/{hardwareId}/hello after connecting and periodically.
 *
 * @param v configuration version currently applied on the board
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ControllerHello(String platform, String fw, String ip, String v) {
}
