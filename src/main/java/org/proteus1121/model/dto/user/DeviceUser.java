package org.proteus1121.model.dto.user;

import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;

@Data
public class DeviceUser {

    private Long id;
    private String username;
    private DeviceRole role;

}
