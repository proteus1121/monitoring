package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.dataset.api.preprocessor.NormalizerStandardize;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.enums.Period;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.repository.PredictedSensorDataRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.proteus1121.service.network.NeuralNetwork;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.proteus1121.model.enums.Period.LIVE;

@Service
@RequiredArgsConstructor
public class MetricService {

    private final SensorDataRepository sensorDataRepository;
    private final PredictedSensorDataRepository predictedSensorDataRepository;
    private final DeviceService deviceService;
    private final SensorDataMapper sensorDataMapper;
    private final NeuralNetwork network;

    public List<SensorData> getMetrics(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp, Period period) {
        Device device = deviceService.checkDevice(deviceId);

        List<SensorDataEntity> rawData = sensorDataRepository
                .findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .toList();

        List<SensorDataEntity> downsampled = downsampleByPeriod(rawData, SensorDataEntity::getTimestamp, startTimestamp, period);

        return downsampled.stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }

    public List<SensorData> getMetricsPredicted(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp, Period period) {
        Device device = deviceService.checkDevice(deviceId);

        List<PredictedSensorDataEntity> rawData = predictedSensorDataRepository
                .findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .toList();

        List<PredictedSensorDataEntity> downsampled = downsampleByPeriod(rawData, PredictedSensorDataEntity::getTimestamp, startTimestamp, period);

        return downsampled.stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }

    public void predictMetrics(Long deviceId, LocalDateTime startTimestamp) {
        List<SensorData> metrics = getMetrics(deviceId, startTimestamp, LocalDateTime.now(), LIVE);
        INDArray inputs = network.extractInputs(metrics);
        INDArray labels = network.extractLabels(metrics);

        NormalizerStandardize normalizer = network.train(inputs, labels);
        List<SensorData> hourlyFeatures = network.generateHourlyFeatures(LocalDateTime.now());

        // Prepare a map to hold predictions
        Map<LocalDateTime, Double> predictions = new HashMap<>();

        // Predict for each hour
        for (SensorData sensorData : hourlyFeatures) {
            double predictedValue = network.predict(sensorData, normalizer);
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
