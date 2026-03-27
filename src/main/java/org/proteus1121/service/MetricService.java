package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.MlProperties;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.PredictedSensorDataEntity;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.Period;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.model.ml.AnomalyContext;
import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.repository.PredictedSensorDataRepository;
import org.proteus1121.repository.SensorDataRepository;
import org.proteus1121.service.ml.AnomalyDetectionService;
import org.proteus1121.service.ml.FeatureBuilder;
import org.proteus1121.service.ml.LocalLlmService;
import org.proteus1121.service.ml.SensorReadingAggregationService;
import org.proteus1121.service.network.NeuralNetwork;
import org.proteus1121.service.notifications.TelegramNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final MlProperties mlProperties;
    private final AnomalyDetectionService anomalyDetectionService;
    private final LocalLlmService localLlmService;
    private final FeatureBuilder featureBuilder;
    private final SensorReadingAggregationService sensorReadingAggregationService;

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

        // Try AI-based anomaly detection first
        if (mlProperties.isEnabled()) {
            try {
                if (performAiAnomalyDetection(device, value)) {
                    return;
                }
            } catch (Exception ex) {
                log.error("AI anomaly check failed for device {}: {}", deviceId, ex.getMessage(), ex);
                // Fall through to legacy thresholds
            }
        }

        // Legacy threshold fallback
        performLegacyThresholdCheck(device, value);
    }

    /**
     * Perform AI-based anomaly detection using XGBoost model and Ollama LLM
     * @return true if anomaly was detected and handled, false otherwise
     */
    private boolean performAiAnomalyDetection(Device device, Double currentValue) {
        // 1) Gather correlated latest values for all sensor types
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(5);
        Map<DeviceType, Double> latestValues = sensorReadingAggregationService
            .getLatestValuesAllDevices(windowStart);
        
        // Include the current reading for this device type
        latestValues.put(device.getType(), currentValue);

        // 2) Engineer features
        Map<String, Double> engineeredFeatures = featureBuilder.build(latestValues);
        List<DeviceType> missingSensors = featureBuilder.missingSensors(latestValues);

        // 3) Score with ML model
        AnomalyContext anomalyContext = new AnomalyContext(
            device.getId(),
            device.getName(),
            device.getType(),
            device.getId().toString(), // Using deviceId as location proxy
            latestValues,
            engineeredFeatures,
            missingSensors
        );

        double probability = anomalyDetectionService.score(anomalyContext);
        boolean isAnomalous = probability >= mlProperties.getThreshold();

        if (isAnomalous) {
            // 4) Generate human-readable message via LLM
            List<String> topContributors = getTopContributingFeatures(engineeredFeatures);
            IncidentContext incidentContext = new IncidentContext(
                device,
                latestValues,
                engineeredFeatures,
                probability,
                topContributors,
                missingSensors
            );

            IncidentMessage message = localLlmService.generateMessage(incidentContext);

            // 5) Log anomaly with context
            log.warn("AI anomaly detected for device {} ({}): probability={:.3f}, title='{}', features={}",
                device.getId(),
                device.getName(),
                probability,
                message.title(),
                engineeredFeatures);

            // 6) Create incident and send notifications
            String incidentTitle = message.title().isEmpty() ? 
                "Anomaly: " + device.getName() : message.title();
            incidentService.createIncident(incidentTitle, CRITICAL, List.of(device));
            telegramNotificationService.sendCriticalNotifications(
                deviceService.getUsersByDeviceId(device.getId()), 
                device, 
                currentValue
            );

            return true;
        }

        return false;
    }

    /**
     * Legacy threshold-based anomaly check (fallback)
     */
    private void performLegacyThresholdCheck(Device device, Double value) {
        Double criticalValue = device.getCriticalValue();
        Double lowerValue = device.getLowerValue();

        if (criticalValue != null && value >= criticalValue) {
            log.warn("Critical alert triggered for device {}: value = {}", device.getId(), value);
            incidentService.createIncident("Critical alert for device " + device.getName() + ": value = " + value,
                    CRITICAL,
                    List.of(device));
            telegramNotificationService.sendCriticalNotifications(deviceService.getUsersByDeviceId(device.getId()), device, value);
        } else if (lowerValue != null && value <= lowerValue) {
            log.warn("Lower alert triggered for device {}: value = {}", device.getId(), value);
            telegramNotificationService.sendCriticalNotifications(deviceService.getUsersByDeviceId(device.getId()), device, value);
            incidentService.createIncident("Critical alert for device " + device.getName() + ": value = " + value,
                    CRITICAL,
                    List.of(device));
        }
    }

    /**
     * Extract top contributing features (simplified - returns feature names with highest values)
     */
    private List<String> getTopContributingFeatures(Map<String, Double> features) {
        return features.entrySet().stream()
            .filter(e -> e.getValue() > 0) // Only positive contributors
            .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
            .limit(3)
            .map(e -> e.getKey() + "=" + String.format("%.2f", e.getValue()))
            .toList();
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

        try {
            // Train ensemble of models
            network.trainEnsemble(metrics);
        } catch (Exception e) {
            log.error("Error training XGBoost ensemble", e);
            return;
        }

        List<SensorData> hourlyFeatures = network.generateHourlyFeatures(LocalDateTime.now());

        Map<LocalDateTime, Double> predictions = new HashMap<>();
        for (SensorData sensorData : hourlyFeatures) {
            double predictedValue;
            try {
                // Use ensemble prediction with uncertainty
                NeuralNetwork.PredictionResult result = network.predictWithUncertainty(sensorData);
                predictedValue = result.getPrediction();
                log.info("Predicted value for device {} at {} (±{}): {}",
                        deviceId,
                        sensorData.getTimestamp(),
                        String.format("%.2f", result.getUpperBound() - result.getLowerBound()),
                        predictedValue);
            } catch (Exception e) {
                log.error("Error predicting value with XGBoost ensemble", e);
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
