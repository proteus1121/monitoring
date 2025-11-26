package org.proteus1121.model.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.proteus1121.model.enums.DeviceRole;

import java.io.Serializable;

@Data
@Entity
@Table(name = "user_devices")
@NoArgsConstructor
@IdClass(UserDeviceId.class)
@EqualsAndHashCode(exclude = {"user", "device"})
@ToString(exclude = {"user", "device"})
public class UserDeviceEntity implements Serializable {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "device_id")
    private Long deviceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", insertable = false, updatable = false)
    private DeviceEntity device;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private DeviceRole role;
    
    public UserDeviceEntity(Long userId, Long deviceId, DeviceRole role) {
        this.userId = userId;
        this.deviceId = deviceId;
        this.role = role;
    }
    
    public UserDeviceEntity(UserEntity user, DeviceEntity device, DeviceRole role) {
        this.user = user;
        this.device = device;
        this.userId = user.getId();
        this.deviceId = device.getId();
        this.role = role;
    }
}
