package org.proteus1121.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.validation.EnumValidator;

import java.util.List;

@Data
public class ShareDeviceRequest {
    
    private List<Long> deviceIds;
    @NotNull
    private String username;
    @NotNull
    @EnumValidator(enumClass = DeviceRole.class, message = "Role must be a valid DeviceRole value")
    private DeviceRole role;
    
}
