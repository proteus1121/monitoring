package org.proteus1121.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDeviceId implements Serializable {
    private Long userId;
    private Long deviceId;
}
