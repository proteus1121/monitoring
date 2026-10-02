package org.proteus1121.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "devices")
@NoArgsConstructor
@AllArgsConstructor
public class DeviceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<UserDeviceEntity> userDevices = new HashSet<>();

    private String name;

    private String description;

    private Double criticalValue;

    private Double lowerValue;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(32)")
    private DeviceType type = DeviceType.UNKNOWN;
    
    private Long delay; // in ms

    /**
     * Board the device is wired to, null when the device is not bound to any controller.
     */
    @Column(name = "controller_id")
    private Long controllerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sensor_model", columnDefinition = "VARCHAR(32)")
    private SensorModel sensorModel;

    /**
     * GPIO number on the controller.
     */
    private Integer pin;

    /**
     * Second GPIO for modules that need two lines (e.g. SCL for I2C).
     */
    @Column(name = "secondary_pin")
    private Integer secondaryPin;

    private LocalDateTime lastChecked = LocalDateTime.now();

    public DeviceEntity(UserDeviceEntity user, String name, String description, Double criticalValue, Double lowerValue, DeviceType type) {
        this.userDevices = Set.of(user);
        this.name = name;
        this.description = description;
        this.criticalValue = criticalValue;
        this.lowerValue = lowerValue;
        this.type = type;
    }
}
