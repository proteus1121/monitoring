package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceType;

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

    @NotBlank
    private Long delay; // in ms
    
    private DeviceType type;
    
    private Set<Long> userIds;

}
