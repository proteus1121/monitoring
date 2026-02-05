package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ml.dmlc.xgboost4j.java.Booster;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.Period;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.repository.PredictedSensorDataRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.proteus1121.service.network.NeuralNetwork;
import org.proteus1121.service.notifications.TelegramNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static org.proteus1121.model.enums.Period.LIVE;
import static org.proteus1121.model.enums.Severity.CRITICAL;

@Slf4j
@Service
@RequiredArgsConstructor
public class MetricService {

    private final SensorDataRepository sensorDataRepository;
    private final PredictedSensorDataRepository predictedSensorDataRepository;
    private final DeviceService deviceService;
    private final SensorDataMapper sensorDataMapper;
    private final NeuralNetwork network;
    private final TelegramNotificationService telegramNotificationService;
    private final IncidentService incidentService;

    public List<SensorData> getMetrics(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp, Period period, boolean bypass) {
        Device device = deviceService.checkDevice(deviceId, DeviceRole.VIEWER, bypass);

        List<SensorDataEntity> rawData = sensorDataRepository
                .findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .toList();

        List<SensorDataEntity> downsampled = downsampleByPeriod(rawData, SensorDataEntity::getTimestamp, startTimestamp, period);

        return downsampled.stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }

    public void processMetrics(Long deviceId, Double value) {
        sensorDataRepository.save(sensorDataMapper.toSensorDataEntity(value, deviceId));

        checkValue(deviceId, value);
    }

    @Transactional(readOnly = true)
    public void checkValue(Long deviceId, Double value) {
        Optional<Device> deviceOpt = deviceService.getDeviceById(deviceId);
        if (deviceOpt.isEmpty()) {
            log.warn("Device {} not found for value check", deviceId);
            return;
        }
        Device device = deviceOpt.get();
        Double criticalValue = device.getCriticalValue();
        Double lowerValue = device.getLowerValue();

        if (criticalValue != null && value >= criticalValue) {
            log.warn("Critical alert triggered for device {}: value = {}", deviceId, value);
            incidentService.createIncident("Critical alert for device " + device.getName() + ": value = " + value,
                    CRITICAL,
                    List.of(device));
            telegramNotificationService.sendCriticalNotifications(deviceService.getUsersByDeviceId(deviceId), device, value);
        } else if (lowerValue != null && value <= lowerValue) {
            log.warn("Lower alert triggered for device {}: value = {}", deviceId, value);
            telegramNotificationService.sendCriticalNotifications(deviceService.getUsersByDeviceId(deviceId), device, value);
            incidentService.createIncident("Critical alert for device " + device.getName() + ": value = " + value,
                    CRITICAL,
                    List.of(device));
        }
    }

    public List<SensorData> getMetricsPredicted(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp, Period period) {
        Device device = deviceService.checkDevice(deviceId, DeviceRole.VIEWER);

        List<PredictedSensorDataEntity> rawData = predictedSensorDataRepository
                .findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .toList();

        List<PredictedSensorDataEntity> downsampled = downsampleByPeriod(rawData, PredictedSensorDataEntity::getTimestamp, startTimestamp, period);

        return downsampled.stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }

    public void predictMetrics(Long deviceId, LocalDateTime startTimestamp) {
        List<SensorData> metrics = getMetrics(deviceId, startTimestamp, LocalDateTime.now(), LIVE, true);
        if (metrics.isEmpty()) {
            log.warn("No metrics available for device {} to train prediction model", deviceId);
            return;
        }
        Booster trainedModel;
        try {
            trainedModel = network.train(metrics);
        } catch (Exception e) {
            log.error("Error training XGBoost model", e);
            return;
        }
        List<SensorData> hourlyFeatures = network.generateHourlyFeatures(LocalDateTime.now());

        Map<LocalDateTime, Double> predictions = new HashMap<>();
        for (SensorData sensorData : hourlyFeatures) {
            double predictedValue;
            try {
                predictedValue = network.predict(trainedModel, sensorData);
            } catch (Exception e) {
                log.error("Error predicting value with XGBoost", e);
                predictedValue = 0.0;
            }
            predictions.put(sensorData.getTimestamp(), predictedValue);
        }

        List<PredictedSensorDataEntity> predicted = predictions.entrySet().stream()
                .map(a -> sensorDataMapper.toPredictedSensorDataEntity(a.getValue(), deviceId, a.getKey()))
                .toList();
        predictedSensorDataRepository.saveAll(predicted);
    }

    private <T> List<T> downsampleByPeriod(List<T> items,
                                           Function<T, LocalDateTime> tsExtractor,
                                           LocalDateTime startTimestamp,
                                           Period period) {
        if (period == LIVE) {
            return items;
        }

        int stepSeconds = period.stepSeconds();
        LocalDateTime alignedStart = alignToBoundary(startTimestamp, stepSeconds);
        var seenBuckets = new java.util.HashSet<Long>();

        return items.stream()
                .filter(e -> seenBuckets.add(bucketIndex(alignedStart, tsExtractor.apply(e), stepSeconds)))
                .toList();
    }

    private long bucketIndex(LocalDateTime alignedStart, LocalDateTime ts, int stepSeconds) {
        long deltaSec = java.time.Duration.between(alignedStart, ts).getSeconds();
        // With fetch starting at alignedStart, deltaSec >= 0.
        return Math.floorDiv(deltaSec, stepSeconds);
    }

    /**
     * Align to the previous boundary of stepSeconds; clears seconds/nanos.
     */
    private LocalDateTime alignToBoundary(LocalDateTime t, int stepSeconds) {
        if (stepSeconds <= 0 || stepSeconds % 60 != 0) {
            return t;
        }
        int stepMinutes = stepSeconds / 60;

        t = t.withSecond(0).withNano(0);
        int m = t.getMinute();
        int alignedMinute = m - (m % stepMinutes);
        return t.withMinute(alignedMinute);
    }
}
