package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class DeviceCommandRequest {

    /**
     * Value to apply on the device, e.g. 1 / 0 for a relay.
     */
    @NotNull
    private Double value;
}
