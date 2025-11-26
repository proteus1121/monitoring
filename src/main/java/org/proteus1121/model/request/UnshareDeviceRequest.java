package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;

import java.util.List;

@Data
public class UnshareDeviceRequest {
    
    private List<Long> deviceIds;
    @NotNull
    private String username;
    
}
