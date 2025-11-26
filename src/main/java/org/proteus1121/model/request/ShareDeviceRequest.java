package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;

import java.util.List;

@Data
public class ShareDeviceRequest {
    
    private List<Long> deviceIds;
    @NotNull
    private String username;
    @NotNull
    @Pattern(regexp = "EDITOR|VIEWER", message = "Role must be EDITOR or VIEWER")
    private DeviceRole role;
    
}
