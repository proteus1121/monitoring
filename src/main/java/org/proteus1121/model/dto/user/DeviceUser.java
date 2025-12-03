package org.proteus1121.model.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.proteus1121.model.enums.DeviceRole;

@Data
@AllArgsConstructor
public class DeviceUser {

    private Long id;
    private String deviceName;
    private DeviceRole role;

}
