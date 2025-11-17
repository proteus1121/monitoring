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
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.proteus1121.model.enums.Resolution;
import org.proteus1121.model.enums.Severity;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "incidents")
@NoArgsConstructor
public class IncidentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String message;

    @Enumerated(EnumType.STRING)
    private Resolution status = Resolution.UNRESOLVED;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    @ManyToMany(cascade = { CascadeType.DETACH }, fetch = FetchType.EAGER)
    @JoinTable(
            name = "incident_devices",
            joinColumns = { @JoinColumn(name = "inc_id") },
            inverseJoinColumns = { @JoinColumn(name = "dev_id") }
    )
    private List<DeviceEntity> devices;

    private LocalDateTime created = LocalDateTime.now();

    public IncidentEntity(String message, Severity severity, List<DeviceEntity> devices) {
        this.message = message;
        this.severity = severity;
        this.devices = devices;
    }
}
