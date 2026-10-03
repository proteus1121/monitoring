package org.proteus1121.service.forecast;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.stat.regression.OLSMultipleLinearRegression;
import org.proteus1121.model.enums.ForecastModel;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * ARIMA(p, d, q) fitted with the Hannan–Rissanen two-step regression:
 * a long AR model estimates the innovations, then the series is regressed on its own lags and the
 * lagged innovations. Cheap enough for a small server and needs no iterative likelihood optimisation.
 */
@Slf4j
@Component
public class ArimaForecaster implements Forecaster {

    @Override
    public ForecastModel model() {
        return ForecastModel.ARIMA;
    }

    @Override
    public double[] forecast(double[] values, LocalDateTime start, int horizon, ForecastSettings settings) {
        int p = settings.arimaP();
        int d = settings.arimaD();
        int q = settings.arimaQ();

        // difference d times, remembering the last value of each level to integrate back
        double[] y = values;
        double[] lastLevels = new double[d];
        for (int k = 0; k < d; k++) {
            if (y.length < 2) return Forecaster.naive(values, horizon);
            lastLevels[k] = y[y.length - 1];
            y = difference(y);
        }

        int n = y.length;
        double mean = Arrays.stream(y).average().orElse(0);
        double[] z = Arrays.stream(y).map(v -> v - mean).toArray();

        double[] future;
        try {
            future = forecastArma(z, p, q, horizon);
        } catch (RuntimeException e) {
            // singular matrix (e.g. constant or binary series) or not enough observations
            log.debug("ARIMA({},{},{}) could not be fitted on {} points: {}", p, d, q, n, e.getMessage());
            return Forecaster.naive(values, horizon);
        }

        for (int i = 0; i < horizon; i++) {
            future[i] += mean;
        }
        for (int k = d - 1; k >= 0; k--) {
            double level = lastLevels[k];
            for (int i = 0; i < horizon; i++) {
                level += future[i];
                future[i] = level;
            }
        }
        return future;
    }

    private double[] forecastArma(double[] z, int p, int q, int horizon) {
        int n = z.length;
        double[] innovations = new double[n];
        int offset = 0;

        if (q > 0) {
            // step 1: long autoregression to estimate the unobserved innovations
            int m = Math.min(Math.max(p + q + 5, 10), n / 3);
            double[] ar = fit(z, m, 0, null, m);
            for (int t = m; t < n; t++) {
                innovations[t] = z[t] - dot(ar, z, t, m);
            }
            offset = m;
        }

        // step 2: regress on p lags of the series and q lags of the innovations
        int t0 = offset + Math.max(p, q);
        if (p + q == 0) {
            return new double[horizon]; // white noise around the mean
        }
        double[] beta = fit(z, p, q, innovations, t0);

        // residuals of the fitted model are the innovations used for forecasting
        double[] residuals = new double[n];
        for (int t = t0; t < n; t++) {
            residuals[t] = z[t] - predict(beta, z, residuals, t, p, q);
        }

        double[] series = Arrays.copyOf(z, n + horizon);
        double[] errors = Arrays.copyOf(residuals, n + horizon); // future innovations are zero
        double[] future = new double[horizon];
        for (int i = 0; i < horizon; i++) {
            int t = n + i;
            series[t] = predict(beta, series, errors, t, p, q);
            future[i] = series[t];
        }
        return future;
    }

    /**
     * Least squares without intercept for z[t] ~ z[t-1..t-p] + e[t-1..t-q], t >= from.
     */
    private double[] fit(double[] z, int p, int q, double[] e, int from) {
        int rows = z.length - from;
        int cols = p + q;
        if (rows <= cols + 2) {
            throw new IllegalArgumentException("not enough observations");
        }
        double[] target = new double[rows];
        double[][] x = new double[rows][cols];
        for (int r = 0; r < rows; r++) {
            int t = from + r;
            target[r] = z[t];
            for (int i = 0; i < p; i++) x[r][i] = z[t - 1 - i];
            for (int j = 0; j < q; j++) x[r][p + j] = e[t - 1 - j];
        }
        OLSMultipleLinearRegression regression = new OLSMultipleLinearRegression();
        regression.setNoIntercept(true);
        regression.newSampleData(target, x);
        return regression.estimateRegressionParameters();
    }

    private double predict(double[] beta, double[] z, double[] e, int t, int p, int q) {
        double value = 0;
        for (int i = 0; i < p; i++) value += beta[i] * z[t - 1 - i];
        for (int j = 0; j < q; j++) value += beta[p + j] * e[t - 1 - j];
        return value;
    }

    private double dot(double[] coefficients, double[] z, int t, int lags) {
        double value = 0;
        for (int i = 0; i < lags; i++) value += coefficients[i] * z[t - 1 - i];
        return value;
    }

    private static double[] difference(double[] y) {
        double[] result = new double[y.length - 1];
        for (int i = 1; i < y.length; i++) result[i - 1] = y[i] - y[i - 1];
        return result;
    }
}
