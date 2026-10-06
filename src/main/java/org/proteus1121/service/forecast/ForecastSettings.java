package org.proteus1121.service.forecast;

import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.ForecastModel;

import java.util.EnumSet;
import java.util.Set;

/**
 * Forecast configuration of one device with defaults and bounds applied.
 */
public record ForecastSettings(Set<ForecastModel> models,
                               int horizonHours,
                               int historyDays,
                               int arimaP,
                               int arimaD,
                               int arimaQ,
                               double kalmanProcessNoise,
                               double kalmanMeasurementNoise,
                               int xgbRounds,
                               int xgbMaxDepth,
                               int transformerWindow,
                               int transformerEpochs) {

    public static final int DEFAULT_HORIZON_HOURS = 24;
    public static final int DEFAULT_HISTORY_DAYS = 30;

    public static ForecastSettings of(DeviceEntity device) {
        Set<ForecastModel> models = device.getForecastModels() == null || device.getForecastModels().isEmpty()
                ? EnumSet.noneOf(ForecastModel.class)
                : EnumSet.copyOf(device.getForecastModels());
        return new ForecastSettings(
                models,
                clamp(device.getForecastHorizonHours(), DEFAULT_HORIZON_HOURS, 1, 168),
                clamp(device.getForecastHistoryDays(), DEFAULT_HISTORY_DAYS, 2, 365),
                clamp(device.getArimaP(), 2, 0, 6),
                clamp(device.getArimaD(), 1, 0, 2),
                clamp(device.getArimaQ(), 1, 0, 6),
                positive(device.getKalmanProcessNoise(), 0.01),
                positive(device.getKalmanMeasurementNoise(), 1.0),
                clamp(device.getXgbRounds(), 100, 10, 500),
                clamp(device.getXgbMaxDepth(), 4, 1, 10),
                clamp(device.getTransformerWindow(), 48, 12, 168),
                clamp(device.getTransformerEpochs(), 40, 5, 200));
    }

    private static int clamp(Integer value, int fallback, int min, int max) {
        return value == null ? fallback : Math.max(min, Math.min(max, value));
    }

    private static double positive(Double value, double fallback) {
        return value == null || value <= 0 ? fallback : value;
    }
}
