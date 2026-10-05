package org.proteus1121.model.dto.controller;

/**
 * An ESP32-CAM said hello for the first time; its flame device is created once the board is saved
 * (CameraService).
 */
public record CameraBoardRegistered(Long controllerId, Long userId) {
}
