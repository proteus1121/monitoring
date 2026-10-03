package org.proteus1121.service.forecast;

import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.ForecastModel;

/**
 * Forecast configuration of one device with defaults and bounds applied.
 */
public record ForecastSettings(ForecastModel model,
                               int horizonHours,
                               int historyDays,
                               int arimaP,
                               int arimaD,
                               int arimaQ,
                               double kalmanProcessNoise,
                               double kalmanMeasurementNoise,
                               int xgbRounds,
                               int xgbMaxDepth) {

    public static final int DEFAULT_HORIZON_HOURS = 24;
    public static final int DEFAULT_HISTORY_DAYS = 30;

    public static ForecastSettings of(DeviceEntity device) {
        return new ForecastSettings(
                device.getForecastModel() == null ? ForecastModel.NONE : device.getForecastModel(),
                clamp(device.getForecastHorizonHours(), DEFAULT_HORIZON_HOURS, 1, 168),
                clamp(device.getForecastHistoryDays(), DEFAULT_HISTORY_DAYS, 2, 365),
                clamp(device.getArimaP(), 2, 0, 6),
                clamp(device.getArimaD(), 1, 0, 2),
                clamp(device.getArimaQ(), 1, 0, 6),
                positive(device.getKalmanProcessNoise(), 0.01),
                positive(device.getKalmanMeasurementNoise(), 1.0),
                clamp(device.getXgbRounds(), 100, 10, 500),
                clamp(device.getXgbMaxDepth(), 4, 1, 10));
    }

    private static int clamp(Integer value, int fallback, int min, int max) {
        return value == null ? fallback : Math.max(min, Math.min(max, value));
    }

    private static double positive(Double value, double fallback) {
        return value == null || value <= 0 ? fallback : value;
    }
}
