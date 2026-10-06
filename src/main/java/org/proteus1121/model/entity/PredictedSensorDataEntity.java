package org.proteus1121.model.entity;

import jakarta.persistence.Column;
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
import org.proteus1121.model.enums.ForecastModel;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "predicted_sensor_data")
@NoArgsConstructor
public class PredictedSensorDataEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private DeviceEntity device;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "value")
    private Double value;

    /**
     * Model that made the forecast; null for forecasts made before a device could have several.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "model", columnDefinition = "VARCHAR(16)")
    private ForecastModel model;

}
