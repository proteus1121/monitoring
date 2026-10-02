package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.util.Set;

@Data
@NoArgsConstructor
public class DeviceRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String description;

    private Double criticalValue;
    
    private Double lowerValue;

    @NotNull
    private Long delay; // in ms
    
    private DeviceType type;
    private Long controllerId;
    private SensorModel sensorModel;
    private Integer pin;
    private Integer secondaryPin;
    
    private Set<Long> userIds;

}
