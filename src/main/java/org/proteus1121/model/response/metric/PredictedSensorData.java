package org.proteus1121.model.response.metric;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.proteus1121.model.enums.ForecastModel;

import java.time.LocalDateTime;

/**
 * One forecast point; {@code model} is null for forecasts made before a device could have several models.
 */
public record PredictedSensorData(@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime timestamp,
                                  Double value,
                                  ForecastModel model) {
}
