package org.proteus1121.service.ml;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.proteus1121.config.properties.FeatureProperties;
import org.proteus1121.model.enums.DeviceType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FeatureBuilderTest {

    private FeatureBuilder featureBuilder;

    @BeforeEach
    void setUp() {
        FeatureProperties props = new FeatureProperties();
        featureBuilder = new FeatureBuilder(props);
    }

    @Test
    void testBuildWithAllSensors() {
        Map<DeviceType, Double> latestValues = new HashMap<>();
        latestValues.put(DeviceType.TEMPERATURE, 25.0);
        latestValues.put(DeviceType.HUMIDITY, 60.0);
        latestValues.put(DeviceType.LPG, 0.5);
        latestValues.put(DeviceType.CH4, 0.2);
        latestValues.put(DeviceType.SMOKE, 100.0);
        latestValues.put(DeviceType.FLAME, 0.0);
        latestValues.put(DeviceType.LIGHT, 500.0);
        latestValues.put(DeviceType.PRESSURE, 1000.0);
        latestValues.put(DeviceType.MOTION, 1.0);

        Map<String, Double> features = featureBuilder.build(latestValues);

        assertNotNull(features);
        assertEquals(25.0, features.get("temp"));
        assertEquals(60.0, features.get("humidity"));
        assertEquals(0.5, features.get("lpg"));
        assertEquals(12, features.size()); // 9 base + 3 delta
    }

    @Test
    void testBuildWithMissingSensors() {
        Map<DeviceType, Double> latestValues = new HashMap<>();
        latestValues.put(DeviceType.TEMPERATURE, 25.0);
        latestValues.put(DeviceType.HUMIDITY, 60.0);
        // Missing other sensors

        Map<String, Double> features = featureBuilder.build(latestValues);

        assertNotNull(features);
        assertEquals(25.0, features.get("temp"));
        assertEquals(60.0, features.get("humidity"));
        // Missing sensors should use defaults
        assertEquals(0.0, features.get("lpg"));
        assertEquals(1013.0, features.get("pressure")); // default
    }

    @Test
    void testMissingSensorsDetection() {
        Map<DeviceType, Double> latestValues = new HashMap<>();
        latestValues.put(DeviceType.TEMPERATURE, 25.0);
        latestValues.put(DeviceType.HUMIDITY, 60.0);

        List<DeviceType> missing = featureBuilder.missingSensors(latestValues);

        assertNotNull(missing);
        assertTrue(missing.contains(DeviceType.LPG));
        assertTrue(missing.contains(DeviceType.CH4));
        assertFalse(missing.contains(DeviceType.TEMPERATURE));
        assertFalse(missing.contains(DeviceType.UNKNOWN));
    }

    @Test
    void testBuildWithEmptyReadings() {
        Map<DeviceType, Double> latestValues = new HashMap<>();

        Map<String, Double> features = featureBuilder.build(latestValues);

        assertNotNull(features);
        assertEquals(12, features.size()); // All defaults
        assertEquals(22.0, features.get("temp")); // default temperature
    }
}

