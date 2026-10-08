package org.proteus1121.service.forecast;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.ForecastScore;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.enums.ForecastModel;
import org.proteus1121.model.response.metric.ForecastResult;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.PredictedSensorDataRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the forecasts of a device with every model chosen in its configuration:
 * readings are averaged per hour in the database, gaps are interpolated, each model is first checked
 * on the last hours it has not seen (MAE / RMSE are stored per model on the device) and then refitted
 * on the whole history to forecast the next hours. Forecasts are rounded like the sensor's own readings.
 * The future part of the previous forecasts is replaced.
 */
@Slf4j
@Service
public class ForecastService {

    /**
     * Less than two days of hourly data gives no meaningful model.
     */
    static final int MIN_HOURS = 48;
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SensorDataRepository sensorDataRepository;
    private final PredictedSensorDataRepository predictedSensorDataRepository;
    private final DeviceRepository deviceRepository;
    private final Map<ForecastModel, Forecaster> forecasters = new EnumMap<>(ForecastModel.class);

    public ForecastService(SensorDataRepository sensorDataRepository,
                           PredictedSensorDataRepository predictedSensorDataRepository,
                           DeviceRepository deviceRepository,
                           List<Forecaster> forecasters) {
        this.sensorDataRepository = sensorDataRepository;
        this.predictedSensorDataRepository = predictedSensorDataRepository;
        this.deviceRepository = deviceRepository;
        forecasters.forEach(f -> this.forecasters.put(f.model(), f));
    }

    public List<ForecastResult> run(Long deviceId) {
        DeviceEntity device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device " + deviceId + " not found"));
        return run(device);
    }

    public List<ForecastResult> run(DeviceEntity device) {
        ForecastSettings settings = ForecastSettings.of(device);
        if (settings.models().isEmpty()) {
            return List.of(ForecastResult.skipped(null, "Forecast is disabled for this device"));
        }

        HourlySeries series = loadSeries(device.getId(), settings.historyDays());
        double[] values = series.values();
        if (values.length < MIN_HOURS) {
            String message = "Not enough data: %d hours, at least %d needed".formatted(values.length, MIN_HOURS);
            return settings.models().stream().map(model -> ForecastResult.skipped(model, message)).toList();
        }
        LocalDateTime last = series.start().plusHours(values.length - 1);

        // models dropped from the configuration must not leave their future on the chart
        predictedSensorDataRepository.deleteByDeviceIdAndTimestampAfter(device.getId(), last);

        if (device.getForecastScores() == null) {
            device.setForecastScores(new EnumMap<>(ForecastModel.class));
        }
        ValuePrecision precision = ValuePrecision.of(sensorDataRepository.findRecentDistinctValues(device.getId()));
        List<ForecastResult> results = new ArrayList<>();
        List<PredictedSensorDataEntity> points = new ArrayList<>();
        for (ForecastModel model : settings.models()) {
            try {
                results.add(runModel(device, forecasters.get(model), series, settings, precision, last, points));
            } catch (Exception e) {
                log.error("Forecast {} for device {} failed", model, device.getId(), e);
                results.add(ForecastResult.skipped(model, "Model failed: " + e.getMessage()));
            }
        }
        predictedSensorDataRepository.saveAll(points);
        deviceRepository.save(device);
        return results;
    }

    private ForecastResult runModel(DeviceEntity device, Forecaster forecaster, HourlySeries series,
                                    ForecastSettings settings, ValuePrecision precision, LocalDateTime last,
                                    List<PredictedSensorDataEntity> points) {
        ForecastModel model = forecaster.model();
        double[] values = series.values();

        // backtest on the last hours the model has not seen
        int holdout = Math.max(1, Math.min(settings.horizonHours(), values.length / 4));
        double[] train = Arrays.copyOf(values, values.length - holdout);
        double[] check = forecaster.forecast(train, series.start(), holdout, settings);
        double absSum = 0, squareSum = 0;
        for (int i = 0; i < holdout; i++) {
            double error = precision.apply(check[i]) - values[train.length + i];
            absSum += Math.abs(error);
            squareSum += error * error;
        }
        double mae = absSum / holdout;
        double rmse = Math.sqrt(squareSum / holdout);

        double[] future = forecaster.forecast(values, series.start(), settings.horizonHours(), settings);
        int saved = 0;
        for (int i = 0; i < future.length; i++) {
            if (!Double.isFinite(future[i])) continue;
            PredictedSensorDataEntity point = new PredictedSensorDataEntity();
            point.setDevice(device);
            point.setTimestamp(last.plusHours(i + 1));
            point.setValue(precision.apply(future[i]));
            point.setModel(model);
            points.add(point);
            saved++;
        }

        device.getForecastScores().put(model, new ForecastScore(mae, rmse, LocalDateTime.now()));
        log.info("Forecast {} for device {}: {} hours on {} points, MAE {}, RMSE {}", model,
                device.getId(), saved, values.length, "%.3f".formatted(mae), "%.3f".formatted(rmse));
        return new ForecastResult(model, true, null, values.length, saved, mae, rmse);
    }

    /**
     * Hourly averages from the database with missing hours linearly interpolated.
     */
    HourlySeries loadSeries(Long deviceId, int historyDays) {
        LocalDateTime from = LocalDateTime.now().minusDays(historyDays).truncatedTo(ChronoUnit.HOURS);
        List<Object[]> rows = sensorDataRepository.findHourlyAverages(deviceId, from);
        if (rows.isEmpty()) {
            return new HourlySeries(from, new double[0]);
        }

        LocalDateTime start = LocalDateTime.parse((String) rows.get(0)[0], HOUR);
        LocalDateTime end = LocalDateTime.parse((String) rows.get(rows.size() - 1)[0], HOUR);
        int size = (int) ChronoUnit.HOURS.between(start, end) + 1;
        double[] values = new double[size];
        boolean[] known = new boolean[size];
        for (Object[] row : rows) {
            int index = (int) ChronoUnit.HOURS.between(start, LocalDateTime.parse((String) row[0], HOUR));
            values[index] = ((Number) row[1]).doubleValue();
            known[index] = true;
        }

        int previous = 0;
        for (int i = 1; i < size; i++) {
            if (!known[i]) continue;
            for (int j = previous + 1; j < i; j++) {
                double fraction = (double) (j - previous) / (i - previous);
                values[j] = values[previous] + fraction * (values[i] - values[previous]);
            }
            previous = i;
        }
        return new HourlySeries(start, values);
    }

    record HourlySeries(LocalDateTime start, double[] values) {
    }
}
