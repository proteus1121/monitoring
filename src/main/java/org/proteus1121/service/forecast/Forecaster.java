package org.proteus1121.service.forecast;

import org.proteus1121.model.enums.ForecastModel;

import java.time.LocalDateTime;

/**
 * Forecasts an hourly series. Implementations are stateless: every call fits a fresh model,
 * so devices never share a trained model.
 */
public interface Forecaster {

    ForecastModel model();

    /**
     * @param values hourly values without gaps, oldest first
     * @param start  time of {@code values[0]}
     * @param horizon number of hours to forecast after the last value
     */
    double[] forecast(double[] values, LocalDateTime start, int horizon, ForecastSettings settings);

    /**
     * Repeats the last value; used when there is too little data or the model cannot be fitted.
     */
    static double[] naive(double[] values, int horizon) {
        double[] result = new double[horizon];
        java.util.Arrays.fill(result, values.length == 0 ? 0 : values[values.length - 1]);
        return result;
    }
}
