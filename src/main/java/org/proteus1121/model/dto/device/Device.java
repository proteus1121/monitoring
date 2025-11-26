package org.proteus1121.model.dto.device;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import org.proteus1121.model.dto.user.UserDevices;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class Device {

    private Long id;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String name;
    private String description;
    private Double criticalValue;
    private Double lowerValue;
    private Long delay; // in ms
    private DeviceStatus status;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime lastChecked;
    private DeviceType type;
    private Set<UserDevices> userDevices;

}
