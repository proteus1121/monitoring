package org.proteus1121.model.enums;

/**
 * Method used to forecast the values of a device.
 */
public enum ForecastModel {
    NONE,
    /**
     * Gradient boosted trees on lagged values and calendar features.
     */
    XGBOOST,
    /**
     * ARIMA(p, d, q) estimated with the Hannan–Rissanen procedure.
     */
    ARIMA,
    /**
     * Kalman filter with a damped local linear trend.
     */
    KALMAN
}
