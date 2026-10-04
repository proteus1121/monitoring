package org.proteus1121.model.entity;

import org.proteus1121.model.enums.ForecastModel;
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

    /**
     * Raw ADC values of a soil moisture probe when dry and in water (0 % and 100 %); null for the defaults of
     * the firmware. Set from the raw values the board reports, see RawReadingService.
     */
    @Column(name = "calibration_dry")
    private Integer calibrationDry;

    @Column(name = "calibration_wet")
    private Integer calibrationWet;

    // --- forecast configuration, see service.forecast ---

    @Enumerated(EnumType.STRING)
    @Column(name = "forecast_model", columnDefinition = "VARCHAR(16)")
    private ForecastModel forecastModel;

    @Column(name = "forecast_horizon_hours")
    private Integer forecastHorizonHours;

    @Column(name = "forecast_history_days")
    private Integer forecastHistoryDays;

    @Column(name = "arima_p")
    private Integer arimaP;

    @Column(name = "arima_d")
    private Integer arimaD;

    @Column(name = "arima_q")
    private Integer arimaQ;

    @Column(name = "kalman_process_noise")
    private Double kalmanProcessNoise;

    @Column(name = "kalman_measurement_noise")
    private Double kalmanMeasurementNoise;

    @Column(name = "xgb_rounds")
    private Integer xgbRounds;

    @Column(name = "xgb_max_depth")
    private Integer xgbMaxDepth;

    // --- result of the last forecast run: error on the held-out last hours ---

    @Column(name = "forecast_mae")
    private Double forecastMae;

    @Column(name = "forecast_rmse")
    private Double forecastRmse;

    @Column(name = "forecast_updated_at")
    private LocalDateTime forecastUpdatedAt;

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
