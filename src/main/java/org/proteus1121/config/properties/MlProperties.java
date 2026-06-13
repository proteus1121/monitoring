package org.proteus1121.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for ML anomaly detection.
 * 
 * Note: Anomaly detection always uses rule-based approach.
 * XGBoost is used only for time-series predictions.
 */
@Component
@ConfigurationProperties(prefix = "ml")
@Data
public class MlProperties {
    /**
     * Enable/disable ML anomaly detection features
     */
    private boolean enabled = true;
    
    /**
     * Anomaly score threshold (0.0 to 1.0)
     * Scores above this threshold are considered anomalies
     */
    private double threshold = 0.72;
}
