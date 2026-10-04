package org.proteus1121.model.dto.device;

import org.proteus1121.model.enums.ForecastModel;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import org.proteus1121.model.dto.user.DeviceUser;
import org.proteus1121.model.enums.DeviceStatus;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class Device {

    private Long id;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String name;
    private String description;
    private Double criticalValue;
    private Double lowerValue;
    private Long delay; // in ms
    private DeviceStatus status;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime lastChecked;
    private DeviceType type;
    private Long controllerId;
    private SensorModel sensorModel;
    private Integer pin;
    private Integer secondaryPin;
    /**
     * Raw ADC values of a soil moisture probe when dry and in water (0 % and 100 %); null for the defaults of
     * the firmware. Set from the raw values the board reports, see RawReadingService.
     */
    private Integer calibrationDry;
    private Integer calibrationWet;
    private ForecastModel forecastModel;
    private Integer forecastHorizonHours;
    private Integer forecastHistoryDays;
    private Integer arimaP;
    private Integer arimaD;
    private Integer arimaQ;
    private Double kalmanProcessNoise;
    private Double kalmanMeasurementNoise;
    private Integer xgbRounds;
    private Integer xgbMaxDepth;
    private Double forecastMae;
    private Double forecastRmse;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime forecastUpdatedAt;
    private Set<DeviceUser> userDevices;
}
