package org.proteus1121.model.dto.controller;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Result of "Scan board": what the board found on its free pins, as suggestions the site pre-fills.
 *
 * @param scannedPins GPIOs the board probed (free ones only)
 */
public record BoardScan(@Schema(requiredMode = REQUIRED) Status status,
                        @Schema(requiredMode = REQUIRED) @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                        LocalDateTime requestedAt,
                        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                        LocalDateTime finishedAt,
                        @Schema(requiredMode = REQUIRED) List<Integer> scannedPins,
                        @Schema(requiredMode = REQUIRED) List<Finding> findings) {

    @Schema(name = "ScanStatus")
    public enum Status {
        // sent to the board, no answer yet
        PENDING,
        DONE,
        // the board did not answer, e.g. offline or older firmware
        TIMEOUT
    }

    @Schema(name = "FindingKind")
    public enum Kind {
        // identified module, its devices can be added as they are
        SENSOR,
        // a display on free pins
        DISPLAY,
        // something pulls or drives the pin, the user picks the module from `options`
        CHOOSE,
        // identified, but the firmware has no driver for it yet
        UNSUPPORTED
    }

    /**
     * @param readings what the board measured while scanning, e.g. TEMPERATURE -> 27.3, LEVEL -> 0
     * @param options  modules this can be with the devices to create; one for an identified sensor
     * @param display  display settings for a DISPLAY finding
     */
    @Schema(name = "ScanFinding")
    public record Finding(@Schema(requiredMode = REQUIRED) Kind kind,
                          @Schema(requiredMode = REQUIRED) String title,
                          @Schema(requiredMode = REQUIRED) List<Integer> pins,
                          @Schema(requiredMode = REQUIRED) Map<String, Double> readings,
                          String note,
                          @Schema(requiredMode = REQUIRED) List<Option> options,
                          DisplaySettings display) {
    }

    @Schema(name = "ScanOption")
    public record Option(@Schema(requiredMode = REQUIRED) SensorModel model,
                         @Schema(requiredMode = REQUIRED) String label,
                         @Schema(requiredMode = REQUIRED) List<SuggestedDevice> devices) {
    }

    public record SuggestedDevice(@Schema(requiredMode = REQUIRED) String name,
                                  @Schema(requiredMode = REQUIRED) DeviceType type,
                                  @Schema(requiredMode = REQUIRED) SensorModel sensorModel,
                                  @Schema(requiredMode = REQUIRED) Integer pin,
                                  Integer secondaryPin) {
    }
}
