package org.proteus1121.service.ml;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.ml.AnomalyContext;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
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
 * Each rule that fires also says why in words (in Ukrainian, the language of the site), for the incident title.
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
     * A rule that fired: its weight in the score and what it means for a person.
     */
    record Hit(double weight, String reason) {
    }

    /**
     * Score the anomaly context using rule-based analysis.
     *
     * @param ctx The anomaly context containing device info and engineered features
     * @return Probability score [0.0, 1.0] where higher values indicate more likely anomalies
     */
    @Override
    public double score(AnomalyContext ctx) {
        List<Hit> hits = evaluate(ctx.engineeredFeatures());
        double anomalyScore = hits.stream().mapToDouble(Hit::weight).sum();

        // Normalize score: average of triggered rules, capped at 1.0
        double finalScore = hits.isEmpty() ? 0.0 : Math.min(1.0, anomalyScore / hits.size());

        if (finalScore > 0.5) {
            log.info("High anomaly score for device {}: {} ({} rules triggered: {})",
                ctx.deviceId(), String.format("%.3f", finalScore), hits.size(), reasons(hits));
        }

        return finalScore;
    }

    /**
     * What the fired rules mean, e.g. "виявлено полум'я", for the incident title; empty when none fired.
     */
    public List<String> reasons(Map<String, Double> features) {
        return reasons(evaluate(features));
    }

    private static List<String> reasons(List<Hit> hits) {
        return hits.stream().map(Hit::reason).toList();
    }

    List<Hit> evaluate(Map<String, Double> features) {
        List<Hit> hits = new ArrayList<>();

        // Rule 1: Critical temperature (high weight)
        double temp = features.getOrDefault("temp", 20.0);
        if (temp < TEMP_MIN_NORMAL || temp > TEMP_MAX_NORMAL) {
            hits.add(new Hit(temp > TEMP_CRITICAL ? 0.9 : 0.6,
                    "температура %s °C поза нормою 0…45 °C".formatted(number(temp))));
        }

        // Rule 2: Extreme humidity
        double humidity = features.getOrDefault("humidity", 50.0);
        if (humidity < HUMIDITY_MIN_NORMAL || humidity > HUMIDITY_MAX_NORMAL) {
            hits.add(new Hit(0.4, "вологість %s %% поза нормою 20…80 %%".formatted(number(humidity))));
        }

        // Rule 3: High LPG concentration (danger)
        double lpg = features.getOrDefault("lpg", 0.0);
        if (lpg > LPG_THRESHOLD) {
            hits.add(new Hit(0.8, "пропан %s ppm, понад 400".formatted(number(lpg))));
        }

        // Rule 4: High CH4 concentration (danger)
        double ch4 = features.getOrDefault("ch4", 0.0);
        if (ch4 > CH4_THRESHOLD) {
            hits.add(new Hit(0.8, "метан %s ppm, понад 400".formatted(number(ch4))));
        }

        // Rule 5: Smoke detection (critical)
        double smoke = features.getOrDefault("smoke", 0.0);
        if (smoke > SMOKE_THRESHOLD) {
            hits.add(new Hit(0.85, "дим %s ppm, понад 300".formatted(number(smoke))));
        }

        // Rule 6: Flame detection (critical - highest priority)
        double flame = features.getOrDefault("flame", 0.0);
        if (flame > 0.5) {  // Binary sensor, > 0.5 means detected
            hits.add(new Hit(0.95, "виявлено полум’я"));
            log.warn("FLAME DETECTED");
        }

        // Rule 7: Rapid temperature change
        double tempDelta = features.getOrDefault("temp_delta_5m", 0.0);
        if (Math.abs(tempDelta) > TEMP_DELTA_THRESHOLD) {
            hits.add(new Hit(0.5, "температура змінилася на %s °C за 5 хв".formatted(number(tempDelta))));
        }

        // Rule 8: Rapid humidity change
        double humidityDelta = features.getOrDefault("humidity_delta_5m", 0.0);
        if (Math.abs(humidityDelta) > HUMIDITY_DELTA_THRESHOLD) {
            hits.add(new Hit(0.4, "вологість змінилася на %s %% за 5 хв".formatted(number(humidityDelta))));
        }

        // Rule 9: Rapid gas concentration increase
        double lpgDelta = features.getOrDefault("lpg_delta_5m", 0.0);
        if (lpgDelta > LPG_DELTA_THRESHOLD) {
            hits.add(new Hit(0.7, "пропан зріс на %s ppm за 5 хв".formatted(number(lpgDelta))));
        }

        // Rule 10: Compound rule - smoke + temperature increase (fire indicator)
        if (smoke > SMOKE_THRESHOLD && temp > 35.0 && tempDelta > 0) {
            hits.add(new Hit(0.9, "дим і зростання температури: ознаки пожежі"));
            log.warn("Fire signature detected (smoke + heat + rising temp)");
        }

        // Rule 11: Gas leak signature - multiple gas readings elevated
        if (lpg > LPG_THRESHOLD && ch4 > CH4_THRESHOLD) {
            hits.add(new Hit(0.85, "пропан і метан разом: ознаки витоку газу"));
            log.warn("Gas leak signature detected (LPG + CH4 elevated)");
        }

        return hits;
    }

    // 31.5, 400, -6.2: one decimal at most, none when it is zero
    private static String number(double value) {
        double rounded = Math.round(value * 10) / 10.0;
        return rounded == Math.rint(rounded) ? String.valueOf((long) rounded) : String.valueOf(rounded);
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
