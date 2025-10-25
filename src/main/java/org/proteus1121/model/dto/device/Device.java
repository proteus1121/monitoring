package org.proteus1121.model.dto.device;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;

import java.time.LocalDateTime;

@Data
public class Device {

    private Long id;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long userId;
    private String name;
    private String description;
    private Double criticalValue;
    private Long delay; // in ms
    private DeviceStatus status;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime lastChecked;
    private DeviceType type;
    
}
