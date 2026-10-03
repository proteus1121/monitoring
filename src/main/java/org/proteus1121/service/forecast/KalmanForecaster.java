package org.proteus1121.service.forecast;

import org.proteus1121.model.enums.ForecastModel;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Kalman filter on a local linear trend model: the state is (level, slope), the slope is damped so a
 * long horizon does not run away. Noise settings are relative to the variance of the hourly changes,
 * so the same values work for temperature and gas concentration.
 */
@Component
public class KalmanForecaster implements Forecaster {

    private static final double SLOPE_DAMPING = 0.95;

    @Override
    public ForecastModel model() {
        return ForecastModel.KALMAN;
    }

    @Override
    public double[] forecast(double[] values, LocalDateTime start, int horizon, ForecastSettings settings) {
        if (values.length < 2) {
            return Forecaster.naive(values, horizon);
        }

        double scale = Math.max(changeVariance(values), 1e-6);
        double qLevel = settings.kalmanProcessNoise() * scale;
        double qSlope = settings.kalmanProcessNoise() * 0.1 * scale;
        double r = settings.kalmanMeasurementNoise() * scale;

        // state and covariance
        double level = values[0];
        double slope = 0;
        double p00 = scale * 10, p01 = 0, p10 = 0, p11 = scale;

        for (int t = 1; t < values.length; t++) {
            // predict: x = F x, P = F P F' + Q with F = [[1, 1], [0, damping]]
            level = level + slope;
            slope = SLOPE_DAMPING * slope;
            double n00 = p00 + p01 + p10 + p11 + qLevel;
            double n01 = SLOPE_DAMPING * (p01 + p11);
            double n10 = SLOPE_DAMPING * (p10 + p11);
            double n11 = SLOPE_DAMPING * SLOPE_DAMPING * p11 + qSlope;

            // update with the observed level, H = [1, 0]
            double innovation = values[t] - level;
            double s = n00 + r;
            double k0 = n00 / s;
            double k1 = n10 / s;
            level += k0 * innovation;
            slope += k1 * innovation;
            p00 = (1 - k0) * n00;
            p01 = (1 - k0) * n01;
            p10 = n10 - k1 * n00;
            p11 = n11 - k1 * n01;
        }

        double[] future = new double[horizon];
        for (int i = 0; i < horizon; i++) {
            level += slope;
            slope *= SLOPE_DAMPING;
            future[i] = level;
        }
        return future;
    }

    private static double changeVariance(double[] values) {
        double mean = 0;
        for (int i = 1; i < values.length; i++) mean += values[i] - values[i - 1];
        mean /= values.length - 1;
        double variance = 0;
        for (int i = 1; i < values.length; i++) {
            double diff = values[i] - values[i - 1] - mean;
            variance += diff * diff;
        }
        return variance / Math.max(1, values.length - 2);
    }
}
