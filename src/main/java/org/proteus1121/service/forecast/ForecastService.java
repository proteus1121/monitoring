package org.proteus1121.service.forecast;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.entity.DeviceEntity;
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
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the forecast of a device with the model chosen in its configuration:
 * readings are averaged per hour in the database, gaps are interpolated, the model is first checked
 * on the last hours it has not seen (MAE / RMSE are stored on the device) and then refitted on the
 * whole history to forecast the next hours. The future part of the previous forecast is replaced.
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

    public ForecastResult run(Long deviceId) {
        DeviceEntity device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device " + deviceId + " not found"));
        return run(device);
    }

    public ForecastResult run(DeviceEntity device) {
        ForecastSettings settings = ForecastSettings.of(device);
        if (settings.model() == ForecastModel.NONE) {
            return ForecastResult.skipped(settings.model(), "Forecast is disabled for this device");
        }
        Forecaster forecaster = forecasters.get(settings.model());

        HourlySeries series = loadSeries(device.getId(), settings.historyDays());
        if (series.values().length < MIN_HOURS) {
            return ForecastResult.skipped(settings.model(),
                    "Not enough data: %d hours, at least %d needed".formatted(series.values().length, MIN_HOURS));
        }

        // backtest on the last hours the model has not seen
        double[] values = series.values();
        int holdout = Math.max(1, Math.min(settings.horizonHours(), values.length / 4));
        double[] train = java.util.Arrays.copyOf(values, values.length - holdout);
        double[] check = forecaster.forecast(train, series.start(), holdout, settings);
        double absSum = 0, squareSum = 0;
        for (int i = 0; i < holdout; i++) {
            double error = check[i] - values[train.length + i];
            absSum += Math.abs(error);
            squareSum += error * error;
        }
        double mae = absSum / holdout;
        double rmse = Math.sqrt(squareSum / holdout);

        double[] future = forecaster.forecast(values, series.start(), settings.horizonHours(), settings);
        LocalDateTime last = series.start().plusHours(values.length - 1);

        predictedSensorDataRepository.deleteByDeviceIdAndTimestampAfter(device.getId(), last);
        List<PredictedSensorDataEntity> points = new ArrayList<>();
        for (int i = 0; i < future.length; i++) {
            if (!Double.isFinite(future[i])) continue;
            PredictedSensorDataEntity point = new PredictedSensorDataEntity();
            point.setDevice(device);
            point.setTimestamp(last.plusHours(i + 1));
            point.setValue(future[i]);
            points.add(point);
        }
        predictedSensorDataRepository.saveAll(points);

        device.setForecastMae(mae);
        device.setForecastRmse(rmse);
        device.setForecastUpdatedAt(LocalDateTime.now());
        deviceRepository.save(device);

        log.info("Forecast {} for device {}: {} hours on {} points, MAE {}, RMSE {}", settings.model(),
                device.getId(), points.size(), values.length, "%.3f".formatted(mae), "%.3f".formatted(rmse));
        return new ForecastResult(settings.model(), true, null, values.length, points.size(), mae, rmse);
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
