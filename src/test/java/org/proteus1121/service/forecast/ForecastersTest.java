package org.proteus1121.service.forecast;

import org.junit.jupiter.api.Test;
import org.proteus1121.model.enums.ForecastModel;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ForecastersTest {

    private static final LocalDateTime START = LocalDateTime.of(2026, 1, 1, 0, 0);

    private static ForecastSettings settings(ForecastModel model, int p, int d, int q) {
        return new ForecastSettings(EnumSet.of(model), 24, 30, p, d, q, 0.01, 1.0, 100, 4, 48, 40);
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
    void unitCircleCheckFindsExplosiveAndNonInvertibleParts() {
        assertTrue(ArimaForecaster.insideUnitCircle(new double[]{0.5, 0.3}, 1));
        assertTrue(!ArimaForecaster.insideUnitCircle(new double[]{1.2}, 1));
        // 1 + 1.5 B is not invertible, 1 + 0.5 B is
        assertTrue(!ArimaForecaster.insideUnitCircle(new double[]{1.5}, -1));
        assertTrue(ArimaForecaster.insideUnitCircle(new double[]{0.5}, -1));
    }

    @Test
    void arimaStaysBoundedOnSpikySeries() {
        // gas-sensor-like series: flat with rare spikes, where Hannan–Rissanen produced runaway forecasts
        double[] values = new double[720];
        Random random = new Random(6);
        for (int i = 0; i < values.length; i++) {
            values[i] = 900 + random.nextGaussian() * 5 + (random.nextDouble() < 0.02 ? 400 * random.nextDouble() : 0);
        }
        double[] forecast = new ArimaForecaster().forecast(values, START, 24, settings(ForecastModel.ARIMA, 2, 1, 1));
        for (double v : forecast) {
            assertTrue(Double.isFinite(v) && Math.abs(v - 900) < 1000, "forecast " + v);
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

    @Test
    void transformerGradientMatchesFiniteDifferences() {
        TinyTransformer net = new TinyTransformer(5, 3, 8, 2, 6, 7);
        Random random = new Random(4);
        double[][] x = new double[5][3];
        for (double[] token : x) for (int f = 0; f < 3; f++) token[f] = random.nextGaussian();
        double target = 0.3;

        double[] grad = new double[net.size()];
        TinyTransformer.Pass pass = net.forward(x);
        net.backward(pass, 2 * (pass.y - target), grad);

        double h = 1e-6;
        for (int i = 0; i < net.size(); i++) {
            double saved = net.params[i];
            net.params[i] = saved + h;
            double plus = Math.pow(net.predict(x) - target, 2);
            net.params[i] = saved - h;
            double minus = Math.pow(net.predict(x) - target, 2);
            net.params[i] = saved;
            double numeric = (plus - minus) / (2 * h);
            assertEquals(numeric, grad[i], 1e-6 + 1e-4 * Math.abs(numeric), "parameter " + i);
        }
    }

    @Test
    void transformerLearnsDailyCycle() {
        // 20 days of a daily sine with noise: the forecast must follow the next day far better than
        // repeating the last value
        double[] values = new double[480];
        Random random = new Random(5);
        for (int i = 0; i < values.length; i++) {
            values[i] = 20 + 3 * Math.sin(2 * Math.PI * i / 24) + random.nextGaussian() * 0.2;
        }

        double[] forecast = new TransformerForecaster().forecast(values, START, 24, settings(ForecastModel.TRANSFORMER, 0, 0, 0));

        double modelError = 0, naiveError = 0;
        for (int i = 0; i < 24; i++) {
            double truth = 20 + 3 * Math.sin(2 * Math.PI * (values.length + i) / 24);
            modelError += Math.abs(forecast[i] - truth);
            naiveError += Math.abs(values[values.length - 1] - truth);
        }
        assertTrue(modelError < 0.5 * naiveError, "MAE " + modelError / 24 + " vs naive " + naiveError / 24);
    }

    @Test
    void transformerStaysWithinHistoryRange() {
        // steady fall on the last days: summing predicted changes must not run past the history
        double[] values = new double[300];
        Random random = new Random(7);
        for (int i = 0; i < values.length; i++) {
            values[i] = 1000 + 200 * Math.sin(2 * Math.PI * i / 24) - (i > 240 ? 10 * (i - 240) : 0)
                    + random.nextGaussian() * 20;
        }
        double low = java.util.Arrays.stream(values).min().orElseThrow();
        double high = java.util.Arrays.stream(values).max().orElseThrow();
        double margin = (high - low) * TransformerForecaster.BOUND_MARGIN;
        for (double v : new TransformerForecaster().forecast(values, START, 72, settings(ForecastModel.TRANSFORMER, 0, 0, 0))) {
            assertTrue(v >= low - margin - 1e-9 && v <= high + margin + 1e-9, "forecast " + v);
        }
    }

    @Test
    void transformerHandlesConstantAndShortSeries() {
        double[] constant = new double[100];
        java.util.Arrays.fill(constant, 3.0);
        for (double v : new TransformerForecaster().forecast(constant, START, 4, settings(ForecastModel.TRANSFORMER, 0, 0, 0))) {
            assertEquals(3.0, v, 1e-9);
        }

        double[] shortSeries = {1, 2, 3, 4, 5};
        for (double v : new TransformerForecaster().forecast(shortSeries, START, 2, settings(ForecastModel.TRANSFORMER, 0, 0, 0))) {
            assertEquals(5.0, v, 1e-9);
        }
    }
}
