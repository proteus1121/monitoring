package org.proteus1121.model.dto.telegram;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceType;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO containing latest sensor values for a device.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceSensorValues {
    
    private Long deviceId;
    private String deviceName;
    private String deviceDescription;
    private Map<DeviceType, SensorValue> values;
    private LocalDateTime lastUpdated;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SensorValue {
        private Double value;
        private LocalDateTime timestamp;
    }
}
