package org.proteus1121.model.dto.mqtt;

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
public record ControllerConfiguration(String v, List<Channel> devices) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Channel(Long id, DeviceType type, SensorModel model, Integer pin, Integer pin2, Long delay,
                          Double min, Double max) {
    }
}
