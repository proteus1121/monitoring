package org.proteus1121.model.dto.controller;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * Progress of a firmware update ordered from the site, as the board reports it.
 *
 * @param state    REQUESTED (sent, no answer yet), DOWNLOADING, DONE (the board restarts), FAILED, TIMEOUT
 * @param progress 0-100
 * @param version  firmware being installed
 * @param error    why it failed, from the board
 */
public record FirmwareUpdateStatus(String state, int progress, String version, String error,
                                   @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                                   LocalDateTime updatedAt) {
}
