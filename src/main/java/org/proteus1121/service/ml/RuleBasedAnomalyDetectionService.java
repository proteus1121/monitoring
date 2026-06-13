package org.proteus1121.service.ml;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.ml.AnomalyContext;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Rule-based anomaly detection service.
 * 
 * This service uses predefined thresholds and rules to detect environmental anomalies.
 * It works immediately without requiring a pre-trained ML model.
 * 
 * Rules include:
 * - Temperature extremes (< 0°C or > 50°C)
 * - High gas concentrations (LPG, CH4)
 * - Smoke detection combined with temperature increase
 * - Flame detection
 * - Unusual sensor correlations
 * - Rapid temporal changes
 * 
 * @author Monitoring System
 */
@Slf4j
@Service
public class RuleBasedAnomalyDetectionService implements AnomalyDetectionService {

    // Thresholds for environmental sensors
    private static final double TEMP_MIN_NORMAL = 0.0;
    private static final double TEMP_MAX_NORMAL = 45.0;
    private static final double TEMP_CRITICAL = 50.0;
    private static final double HUMIDITY_MIN_NORMAL = 20.0;
    private static final double HUMIDITY_MAX_NORMAL = 80.0;
    private static final double LPG_THRESHOLD = 400.0;
    private static final double CH4_THRESHOLD = 400.0;
    private static final double SMOKE_THRESHOLD = 300.0;
    private static final double TEMP_DELTA_THRESHOLD = 5.0;  // 5°C change in 5 minutes
    private static final double HUMIDITY_DELTA_THRESHOLD = 20.0;  // 20% change in 5 minutes
    private static final double LPG_DELTA_THRESHOLD = 200.0;  // Rapid gas increase

    /**
     * Score the anomaly context using rule-based analysis.
     * 
     * @param ctx The anomaly context containing device info and engineered features
     * @return Probability score [0.0, 1.0] where higher values indicate more likely anomalies
     */
    @Override
    public double score(AnomalyContext ctx) {
        Map<String, Double> features = ctx.engineeredFeatures();
        double anomalyScore = 0.0;
        int ruleCount = 0;

        // Rule 1: Critical temperature (high weight)
        double temp = features.getOrDefault("temp", 20.0);
        if (temp < TEMP_MIN_NORMAL || temp > TEMP_MAX_NORMAL) {
            anomalyScore += (temp > TEMP_CRITICAL) ? 0.9 : 0.6;
            ruleCount++;
            log.debug("Temperature anomaly detected for device {}: {}°C", ctx.deviceId(), temp);
        }

        // Rule 2: Extreme humidity
        double humidity = features.getOrDefault("humidity", 50.0);
        if (humidity < HUMIDITY_MIN_NORMAL || humidity > HUMIDITY_MAX_NORMAL) {
            anomalyScore += 0.4;
            ruleCount++;
            log.debug("Humidity anomaly detected for device {}: {}%", ctx.deviceId(), humidity);
        }

        // Rule 3: High LPG concentration (danger)
        double lpg = features.getOrDefault("lpg", 0.0);
        if (lpg > LPG_THRESHOLD) {
            anomalyScore += 0.8;
            ruleCount++;
            log.debug("LPG anomaly detected for device {}: {}", ctx.deviceId(), lpg);
        }

        // Rule 4: High CH4 concentration (danger)
        double ch4 = features.getOrDefault("ch4", 0.0);
        if (ch4 > CH4_THRESHOLD) {
            anomalyScore += 0.8;
            ruleCount++;
            log.debug("CH4 anomaly detected for device {}: {}", ctx.deviceId(), ch4);
        }

        // Rule 5: Smoke detection (critical)
        double smoke = features.getOrDefault("smoke", 0.0);
        if (smoke > SMOKE_THRESHOLD) {
            anomalyScore += 0.85;
            ruleCount++;
            log.debug("Smoke anomaly detected for device {}: {}", ctx.deviceId(), smoke);
        }

        // Rule 6: Flame detection (critical - highest priority)
        double flame = features.getOrDefault("flame", 0.0);
        if (flame > 0.5) {  // Binary sensor, > 0.5 means detected
            anomalyScore += 0.95;
            ruleCount++;
            log.warn("FLAME DETECTED for device {}", ctx.deviceId());
        }

        // Rule 7: Rapid temperature change
        double tempDelta = features.getOrDefault("temp_delta_5m", 0.0);
        if (Math.abs(tempDelta) > TEMP_DELTA_THRESHOLD) {
            anomalyScore += 0.5;
            ruleCount++;
            log.debug("Rapid temperature change detected for device {}: {} °C/5min", ctx.deviceId(), tempDelta);
        }

        // Rule 8: Rapid humidity change
        double humidityDelta = features.getOrDefault("humidity_delta_5m", 0.0);
        if (Math.abs(humidityDelta) > HUMIDITY_DELTA_THRESHOLD) {
            anomalyScore += 0.4;
            ruleCount++;
            log.debug("Rapid humidity change detected for device {}: {} %/5min", ctx.deviceId(), humidityDelta);
        }

        // Rule 9: Rapid gas concentration increase
        double lpgDelta = features.getOrDefault("lpg_delta_5m", 0.0);
        if (lpgDelta > LPG_DELTA_THRESHOLD) {
            anomalyScore += 0.7;
            ruleCount++;
            log.debug("Rapid gas increase detected for device {}: {}/5min", ctx.deviceId(), lpgDelta);
        }

        // Rule 10: Compound rule - smoke + temperature increase (fire indicator)
        if (smoke > SMOKE_THRESHOLD && temp > 35.0 && tempDelta > 0) {
            anomalyScore += 0.9;
            ruleCount++;
            log.warn("Fire signature detected for device {} (smoke + heat + rising temp)", ctx.deviceId());
        }

        // Rule 11: Gas leak signature - multiple gas readings elevated
        if (lpg > LPG_THRESHOLD && ch4 > CH4_THRESHOLD) {
            anomalyScore += 0.85;
            ruleCount++;
            log.warn("Gas leak signature detected for device {} (LPG + CH4 elevated)", ctx.deviceId());
        }

        // Normalize score: average of triggered rules, capped at 1.0
        double finalScore = ruleCount > 0 ? Math.min(1.0, anomalyScore / ruleCount) : 0.0;
        
        if (finalScore > 0.5) {
            log.info("High anomaly score for device {}: {} ({} rules triggered)", 
                ctx.deviceId(), String.format("%.3f", finalScore), ruleCount);
        }

        return finalScore;
    }

    /**
     * Check if the model is ready (always true for rule-based)
     * 
     * @return true
     */
    public boolean isReady() {
        return true;
    }

    /**
     * Check if model is loaded (always true for rule-based)
     * 
     * @return true
     */
    public boolean isModelLoaded() {
        return true;
    }
}
