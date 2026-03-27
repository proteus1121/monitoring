package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.FeatureProperties;
import org.proteus1121.model.enums.DeviceType;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds feature vectors for anomaly detection from sensor readings
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeatureBuilder {

    private final FeatureProperties featureProps;

    /**
     * Build a feature vector from latest sensor values for all device types
     */
    public Map<String, Double> build(Map<DeviceType, Double> latestValues) {
        Map<String, Double> features = new LinkedHashMap<>();

        // Extract base sensor values with defaults for missing sensors
        double temp = latestValues.getOrDefault(DeviceType.TEMPERATURE, featureProps.getDefaultImpute().get("temperature"));
        double humidity = latestValues.getOrDefault(DeviceType.HUMIDITY, featureProps.getDefaultImpute().get("humidity"));
        double lpg = latestValues.getOrDefault(DeviceType.LPG, featureProps.getDefaultImpute().get("lpg"));
        double ch4 = latestValues.getOrDefault(DeviceType.CH4, featureProps.getDefaultImpute().get("ch4"));
        double smoke = latestValues.getOrDefault(DeviceType.SMOKE, featureProps.getDefaultImpute().get("smoke"));
        double flame = latestValues.getOrDefault(DeviceType.FLAME, featureProps.getDefaultImpute().get("flame"));
        double light = latestValues.getOrDefault(DeviceType.LIGHT, featureProps.getDefaultImpute().get("light"));
        double pressure = latestValues.getOrDefault(DeviceType.PRESSURE, featureProps.getDefaultImpute().get("pressure"));
        double motion = latestValues.getOrDefault(DeviceType.MOTION, featureProps.getDefaultImpute().get("motion"));

        // Add base features
        features.put("temp", temp);
        features.put("humidity", humidity);
        features.put("lpg", lpg);
        features.put("ch4", ch4);
        features.put("smoke", smoke);
        features.put("flame", flame);
        features.put("light", light);
        features.put("pressure", pressure);
        features.put("motion", motion);

        // TODO: Add delta/temporal features when historical data is available
        // For now, using placeholder zeros (model expects 12 features)
        features.put("temp_delta_5m", 0.0);
        features.put("humidity_delta_5m", 0.0);
        features.put("lpg_delta_5m", 0.0);

        log.debug("Built features from {} sensor readings", latestValues.size());
        return features;
    }

    /**
     * Identify which sensors are missing from the readings
     */
    public List<DeviceType> missingSensors(Map<DeviceType, Double> latestValues) {
        return Arrays.stream(DeviceType.values())
            .filter(dt -> dt != DeviceType.UNKNOWN)
            .filter(dt -> !latestValues.containsKey(dt))
            .toList();
    }
}

