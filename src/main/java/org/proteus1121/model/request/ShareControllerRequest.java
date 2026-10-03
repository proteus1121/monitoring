package org.proteus1121.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;

@Data
public class ShareControllerRequest {

    @NotBlank
    private String username;

    @NotNull
    private DeviceRole role;
}
