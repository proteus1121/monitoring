package org.proteus1121.model.dto.controller;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Result of "Scan board": what the board found on its free pins, as suggestions the site pre-fills.
 *
 * @param scannedPins GPIOs the board probed (free ones only)
 */
public record BoardScan(Status status,
                        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                        LocalDateTime requestedAt,
                        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                        LocalDateTime finishedAt,
                        List<Integer> scannedPins,
                        List<Finding> findings) {

    public enum Status {
        // sent to the board, no answer yet
        PENDING,
        DONE,
        // the board did not answer, e.g. offline or older firmware
        TIMEOUT
    }

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
    public record Finding(Kind kind, String title, List<Integer> pins, Map<String, Double> readings, String note,
                          List<Option> options, DisplaySettings display) {
    }

    public record Option(SensorModel model, String label, List<SuggestedDevice> devices) {
    }

    public record SuggestedDevice(String name, DeviceType type, SensorModel sensorModel, Integer pin,
                                  Integer secondaryPin) {
    }
}
