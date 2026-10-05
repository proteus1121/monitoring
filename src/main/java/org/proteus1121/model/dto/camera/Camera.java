package org.proteus1121.model.dto.camera;

import io.swagger.v3.oas.annotations.media.Schema;
import org.proteus1121.model.enums.DeviceRole;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * An ESP32-CAM of the user or shared with them, for the Cameras page.
 *
 * @param cameraFound   false when the camera did not start on the board, null when not reported yet
 * @param flameDeviceId the board's flame device (CAMERA module), null when there is none
 * @param vision        the detector's result with the latest frame, null when no frame came since the server
 *                      started
 */
public record Camera(@Schema(requiredMode = REQUIRED) Long controllerId,
                     @Schema(requiredMode = REQUIRED) String name,
                     @Schema(requiredMode = REQUIRED) String hardwareId,
                     @Schema(requiredMode = REQUIRED) DeviceRole role,
                     @Schema(requiredMode = REQUIRED) boolean online,
                     Boolean cameraFound,
                     String firmwareVersion,
                     Long flameDeviceId,
                     CameraVision vision) {
}
