package org.proteus1121.service.forecast;

import lombok.extern.slf4j.Slf4j;
import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import org.proteus1121.model.enums.ForecastModel;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Gradient boosted trees on calendar features (hour of day, day of week) and lagged values
 * (previous hour, two hours ago, same hour yesterday). The horizon is forecast recursively.
 */
@Slf4j
@Component
public class XgboostForecaster implements Forecaster {

    private static final int FEATURES = 5;
    private static final int MIN_POINTS = 30;

    @Override
    public ForecastModel model() {
        return ForecastModel.XGBOOST;
    }

    @Override
    public double[] forecast(double[] values, LocalDateTime start, int horizon, ForecastSettings settings) {
        // the daily lag needs one full day of history before the first training row
        int firstRow = 24;
        int rows = values.length - firstRow;
        if (values.length < MIN_POINTS || rows < 6) {
            return Forecaster.naive(values, horizon);
        }

        double[] series = java.util.Arrays.copyOf(values, values.length + horizon);
        float[] features = new float[rows * FEATURES];
        float[] labels = new float[rows];
        for (int r = 0; r < rows; r++) {
            int t = firstRow + r;
            fill(features, r, series, t, start);
            labels[r] = (float) series[t];
        }

        DMatrix train = null;
        Booster booster = null;
        try {
            train = new DMatrix(features, rows, FEATURES, Float.NaN);
            train.setLabel(labels);

            Map<String, Object> params = new HashMap<>();
            params.put("objective", "reg:squarederror");
            params.put("max_depth", settings.xgbMaxDepth());
            params.put("eta", 0.1);
            params.put("subsample", 0.9);
            params.put("verbosity", 0);
            params.put("nthread", 1);
            booster = XGBoost.train(train, params, settings.xgbRounds(), new HashMap<>(), null, null);

            double[] future = new double[horizon];
            float[] row = new float[FEATURES];
            for (int i = 0; i < horizon; i++) {
                int t = values.length + i;
                fill(row, 0, series, t, start);
                DMatrix one = new DMatrix(row, 1, FEATURES, Float.NaN);
                try {
                    series[t] = booster.predict(one)[0][0];
                } finally {
                    one.dispose();
                }
                future[i] = series[t];
            }
            return future;
        } catch (Exception e) {
            log.warn("XGBoost forecast failed: {}", e.getMessage());
            return Forecaster.naive(values, horizon);
        } finally {
            // native memory is not managed by the JVM
            if (booster != null) booster.dispose();
            if (train != null) train.dispose();
        }
    }

    private static void fill(float[] target, int row, double[] series, int t, LocalDateTime start) {
        LocalDateTime time = start.plusHours(t);
        int base = row * FEATURES;
        target[base] = time.getHour();
        target[base + 1] = time.getDayOfWeek().getValue();
        target[base + 2] = (float) series[t - 1];
        target[base + 3] = (float) series[t - 2];
        target[base + 4] = (float) series[t - 24];
    }
}
