package org.proteus1121.model.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "devices")
@NoArgsConstructor
public class DeviceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    private String name;

    private String description;

    private Double criticalValue;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    private LocalDateTime lastChecked = LocalDateTime.now();

    public DeviceEntity(UserEntity user, String name, String description, Double criticalValue, DeviceType type) {
        this.user = user;
        this.name = name;
        this.description = description;
        this.criticalValue = criticalValue;
        this.type = type;
    }
}
