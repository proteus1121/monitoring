package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.dataset.api.preprocessor.NormalizerStandardize;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.entity.SensorDataEntity;
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

@Service
@RequiredArgsConstructor
public class MetricService {
    
    private final SensorDataRepository sensorDataRepository;
    private final PredictedSensorDataRepository predictedSensorDataRepository;
    private final DeviceService deviceService;
    private final SensorDataMapper sensorDataMapper;
    private final NeuralNetwork network;
    
    public List<SensorData> getMetrics(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp) {
        Device device = deviceService.checkDevice(deviceId);

        return sensorDataRepository.findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }

    public List<SensorData> getMetricsPredicted(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp) {
        Device device = deviceService.checkDevice(deviceId);

        return predictedSensorDataRepository.findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }
    
    public void predictMetrics(Long deviceId, LocalDateTime startTimestamp) {
        List<SensorData> metrics = getMetrics(deviceId, startTimestamp, LocalDateTime.now());
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
}
