package org.proteus1121.model.dto.camera;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * What the flame detector of an ESP32-CAM saw in a frame (firmware camera/Camera.h).
 *
 * @param alarm     flame confirmed (counter full, held for 3 s)
 * @param ratio     share of flame-coloured samples in the frame
 * @param variance  variance of the ratio over the last frames (flicker)
 * @param consec    confirmations so far, the alarm needs {@code confirm}
 * @param box       x1, y1, x2, y2 of the flame-coloured pixels in the width x height frame, null without them
 * @param fps       frames analysed per second
 * @param cameraFps frames taken from the sensor per second
 * @param mean      mean R, G, B of the analysed frame
 */
public record CameraVision(@Schema(requiredMode = REQUIRED) boolean alarm,
                           @Schema(requiredMode = REQUIRED) double ratio,
                           @Schema(requiredMode = REQUIRED) double variance,
                           @Schema(requiredMode = REQUIRED) int consec,
                           @Schema(requiredMode = REQUIRED) int confirm,
                           List<Integer> box,
                           @Schema(requiredMode = REQUIRED) int width,
                           @Schema(requiredMode = REQUIRED) int height,
                           @Schema(requiredMode = REQUIRED) double fps,
                           @Schema(requiredMode = REQUIRED) double cameraFps,
                           List<Integer> mean,
                           @Schema(requiredMode = REQUIRED)
                           @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                           LocalDateTime received) {
}
