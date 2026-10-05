package org.proteus1121.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Picture of an incident: the frame a camera raised its flame alarm on, with the flame's box drawn on it.
 * A table of its own so lists of incidents do not load the pictures.
 */
@Data
@Entity
@Table(name = "incident_images")
@NoArgsConstructor
@AllArgsConstructor
public class IncidentImageEntity {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    // a QVGA / VGA JPEG is well under the 16 MB of MEDIUMBLOB
    @Column(nullable = false, columnDefinition = "MEDIUMBLOB")
    private byte[] jpeg;

    private LocalDateTime created = LocalDateTime.now();

    public IncidentImageEntity(Long incidentId, byte[] jpeg) {
        this.incidentId = incidentId;
        this.jpeg = jpeg;
    }
}
