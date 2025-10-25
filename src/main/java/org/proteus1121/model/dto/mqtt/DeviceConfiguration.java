package org.proteus1121.model.dto.mqtt;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DeviceConfiguration {

    private Double criticalValue;
    private Long delay; // ms
    
}
