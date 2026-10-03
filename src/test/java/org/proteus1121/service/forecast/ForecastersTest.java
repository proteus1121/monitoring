package org.proteus1121.service.forecast;

import org.junit.jupiter.api.Test;
import org.proteus1121.model.enums.ForecastModel;

import java.time.LocalDateTime;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ForecastersTest {

    private static final LocalDateTime START = LocalDateTime.of(2026, 1, 1, 0, 0);

    private static ForecastSettings settings(ForecastModel model, int p, int d, int q) {
        return new ForecastSettings(model, 24, 30, p, d, q, 0.01, 1.0, 100, 4);
    }

    @Test
    void arimaFollowsLinearTrend() {
        double[] values = new double[200];
        Random random = new Random(1);
        for (int i = 0; i < values.length; i++) {
            values[i] = 10 + 0.5 * i + random.nextGaussian() * 0.1;
        }

        double[] forecast = new ArimaForecaster().forecast(values, START, 10, settings(ForecastModel.ARIMA, 1, 1, 1));

        for (int i = 0; i < 10; i++) {
            double expected = 10 + 0.5 * (values.length + i);
            assertEquals(expected, forecast[i], 1.0, "hour " + i);
        }
    }

    @Test
    void arimaRecoversAutoregressiveProcess() {
        // x[t] = 0.8 x[t-1] + noise around 20: the forecast decays towards the mean
        double[] values = new double[500];
        Random random = new Random(2);
        double x = 5;
        for (int i = 0; i < values.length; i++) {
            x = 0.8 * x + random.nextGaussian() * 0.5;
            values[i] = 20 + x;
        }

        double[] forecast = new ArimaForecaster().forecast(values, START, 48, settings(ForecastModel.ARIMA, 1, 0, 0));

        double last = values[values.length - 1] - 20;
        assertEquals(20 + 0.8 * last, forecast[0], 0.6);
        assertEquals(20, forecast[47], 0.6);
    }

    @Test
    void arimaFallsBackOnConstantSeries() {
        double[] values = new double[100];
        java.util.Arrays.fill(values, 1.0);

        double[] forecast = new ArimaForecaster().forecast(values, START, 5, settings(ForecastModel.ARIMA, 2, 1, 1));

        for (double v : forecast) {
            assertEquals(1.0, v, 1e-9);
        }
    }

    @Test
    void kalmanTracksLevelAndTrend() {
        double[] values = new double[150];
        Random random = new Random(3);
        for (int i = 0; i < values.length; i++) {
            values[i] = 100 - 0.2 * i + random.nextGaussian() * 0.3;
        }

        double[] forecast = new KalmanForecaster().forecast(values, START, 5, settings(ForecastModel.KALMAN, 0, 0, 0));

        double expectedNext = 100 - 0.2 * values.length;
        assertEquals(expectedNext, forecast[0], 1.0);
        assertTrue(forecast[4] < forecast[0], "downward trend continues");
    }

    @Test
    void kalmanHandlesConstantSeries() {
        double[] values = new double[50];
        java.util.Arrays.fill(values, 7.0);

        double[] forecast = new KalmanForecaster().forecast(values, START, 3, settings(ForecastModel.KALMAN, 0, 0, 0));

        for (double v : forecast) {
            assertEquals(7.0, v, 1e-6);
        }
    }
}
