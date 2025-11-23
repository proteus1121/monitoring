package org.proteus1121.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Entity
@Table(name = "devices")
@NoArgsConstructor
public class DeviceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany(cascade = { CascadeType.DETACH }, fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_devices",
            joinColumns = { @JoinColumn(name = "user_id") },
            inverseJoinColumns = { @JoinColumn(name = "device_id") }
    )
    private Set<UserEntity> users;

    private String name;

    private String description;

    private Double criticalValue;

    private Double lowerValue;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Enumerated(EnumType.STRING)
    private DeviceType type = DeviceType.UNKNOWN;
    
    private Long delay; // in ms

    private LocalDateTime lastChecked = LocalDateTime.now();

    public DeviceEntity(UserEntity user, String name, String description, Double criticalValue, Double lowerValue, DeviceType type) {
        this.users = Set.of(user);
        this.name = name;
        this.description = description;
        this.criticalValue = criticalValue;
        this.lowerValue = lowerValue;
        this.type = type;
    }
}
