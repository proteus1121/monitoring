package org.proteus1121.model.response.prediction;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * API Response DTO for predictions with uncertainty and explanations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("predicted_value")
    private double predictedValue;

    @JsonProperty("unit")
    private String unit;

    /**
     * Confidence interval (0-1)
     */
    @JsonProperty("confidence")
    private double confidence;

    /**
     * Lower bound of prediction interval
     */
    @JsonProperty("lower_bound")
    private double lowerBound;

    /**
     * Upper bound of prediction interval
     */
    @JsonProperty("upper_bound")
    private double upperBound;

    /**
     * Standard deviation of prediction
     */
    @JsonProperty("std_dev")
    private double stdDev;

    /**
     * Risk assessment: LOW, MEDIUM, HIGH
     */
    @JsonProperty("risk_level")
    private String riskLevel;

    /**
     * Feature importance (SHAP-like explanations)
     */
    @JsonProperty("feature_importance")
    private Map<String, Double> featureImportance;

    /**
     * Anomaly detection flag
     */
    @JsonProperty("is_anomalous")
    private boolean isAnomalous;

    /**
     * Alert message if anomaly detected
     */
    @JsonProperty("alert_message")
    private String alertMessage;

    /**
     * Full explanation object (JSON)
     */
    @JsonProperty("explanation")
    private Map<String, Object> explanation;

    /**
     * Model calibration quality
     */
    @JsonProperty("calibration_quality")
    private String calibrationQuality;

    /**
     * Timestamp of prediction generation
     */
    @JsonProperty("generated_at")
    private LocalDateTime generatedAt;
}
