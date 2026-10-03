package org.proteus1121.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.DeviceRole;

/**
 * A whole board shared with a user: every device on it, including ones added later, is shared with the role.
 */
@Data
@Entity
@Table(name = "controller_shares", uniqueConstraints = @UniqueConstraint(columnNames = {"controller_id", "user_id"}))
@NoArgsConstructor
public class ControllerShareEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "controller_id", nullable = false)
    private Long controllerId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(16)", nullable = false)
    private DeviceRole role;

    public ControllerShareEntity(Long controllerId, Long userId, DeviceRole role) {
        this.controllerId = controllerId;
        this.userId = userId;
        this.role = role;
    }
}
