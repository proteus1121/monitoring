package org.proteus1121.model.enums;

/**
 * Method used to forecast the values of a device. A device may use several at once.
 */
public enum ForecastModel {
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
    KALMAN,
    /**
     * Small Transformer with causal self-attention over the last hours, trained on the device history.
     */
    TRANSFORMER
}
