package org.proteus1121.model.dto.mqtt;

import org.proteus1121.model.enums.DisplayModel;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.util.List;

/**
 * Payload published to users/{userId}/controllers/{hardwareId}/configuration.
 * Keys are short because the board parses it with limited RAM.
 *
 * @param v version of the configuration, the board echoes it back in its hello message
 */
public record ControllerConfiguration(String v, List<Channel> devices, Display display) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Channel(Long id, DeviceType type, SensorModel model, Integer pin, Integer pin2, Long delay) {
    }

    /**
     * Display the board drives; it keeps this in flash to show the screen from power-on.
     */
    public record Display(DisplayModel model, List<Integer> pins, boolean flip) {
    }
}
