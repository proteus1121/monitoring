package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import ml.dmlc.xgboost4j.java.XGBoostError;
import org.proteus1121.config.properties.MlProperties;
import org.proteus1121.model.ml.AnomalyContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import java.io.IOException;
import java.util.List;

/**
 * XGBoost-based anomaly detection service using in-process scoring.
 * 
 * This service loads a pre-trained XGBoost model and scores sensor readings
 * to detect environmental anomalies. It supports multi-sensor analysis by
 * engineering features from correlated sensor readings.
 * 
 * Feature Vector (12 features):
 * - Base features: temperature, humidity, lpg, ch4, smoke, flame, light, pressure, motion (9)
 * - Temporal features: temp_delta_5m, humidity_delta_5m, lpg_delta_5m (3)
 * 
 * @author Monitoring System
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ml.provider", havingValue = "xgboost4j", matchIfMissing = true)
public class XgboostAnomalyDetectionService implements AnomalyDetectionService {

    private final MlProperties props;
    private Booster booster;
    private List<String> featureOrder;
    private static final int FEATURE_COUNT = 12;

    /**
     * Initialize the XGBoost model from the configured file path.
     * Called automatically by Spring after bean creation.
     */
    @jakarta.annotation.PostConstruct
    void init() {
        if (!props.isEnabled()) {
            log.warn("ML anomaly detection is disabled in configuration");
            return;
        }

        try {
            String modelPath = ResourceUtils.getFile(props.getModelPath()).getAbsolutePath();
            this.booster = XGBoost.loadModel(modelPath);
            
            // Define the feature order to match the model's training order
            this.featureOrder = List.of(
                "temp", "humidity", "lpg", "ch4", "smoke", "flame", "light", "pressure", "motion",
                "temp_delta_5m", "humidity_delta_5m", "lpg_delta_5m"
            );
            
            log.info("XGBoost model loaded successfully from: {}", modelPath);
            log.info("Feature order: {}", featureOrder);
        } catch (IOException e) {
            log.error("File not found when loading XGBoost model from path: {}", props.getModelPath(), e);
            this.booster = null;
        } catch (XGBoostError e) {
            log.error("XGBoost error while loading model from {}: {}", props.getModelPath(), e.getMessage(), e);
            this.booster = null;
        } catch (Exception e) {
            log.error("Unexpected error loading XGBoost model: {}", e.getMessage(), e);
            this.booster = null;
        }
    }

    /**
     * Score the anomaly context and return an anomaly probability.
     * 
     * @param ctx The anomaly context containing device info and engineered features
     * @return Probability score [0.0, 1.0] where higher values indicate more likely anomalies
     *         Returns 0.0 if model is not loaded or scoring fails
     */
    @Override
    public double score(AnomalyContext ctx) {
        if (booster == null) {
            log.warn("XGBoost model not loaded, cannot score device {}: returning 0.0", ctx.deviceId());
            return 0.0;
        }

        try {
            // Build feature array in the order the model expects
            float[] features = buildFeatureArray(ctx);
            
            // Create DMatrix for XGBoost (1 sample, FEATURE_COUNT features)
            long startTime = System.currentTimeMillis();
            DMatrix dmatrix = new DMatrix(features, 1, FEATURE_COUNT, Float.NaN);
            
            // Get predictions from the model
            float[][] predictions = booster.predict(dmatrix);
            long elapsed = System.currentTimeMillis() - startTime;

            // Extract the anomaly probability (assuming binary classification output)
            // predictions[sample_index][class_index]
            double probability = predictions[0][0];
            
            // Clamp to valid range [0.0, 1.0]
            probability = Math.max(0.0, Math.min(1.0, probability));
            
            log.debug("XGBoost scoring for device {} completed in {}ms: probability={:.3f}", 
                ctx.deviceId(), elapsed, probability);
            log.debug("Feature values: {}", ctx.engineeredFeatures());
            
            return probability;
        } catch (XGBoostError e) {
            log.error("XGBoost prediction error for device {}: {}", ctx.deviceId(), e.getMessage(), e);
            return 0.0;
        } catch (IllegalArgumentException e) {
            log.error("Invalid DMatrix arguments for device {}: {}", ctx.deviceId(), e.getMessage(), e);
            return 0.0;
        } catch (Exception e) {
            log.error("Unexpected error during XGBoost scoring for device {}: {}", ctx.deviceId(), e.getMessage(), e);
            return 0.0;
        }
    }

    /**
     * Build the feature array in the correct order for the XGBoost model.
     * Missing features are filled with 0.0 as NaN values.
     * 
     * @param ctx The anomaly context containing engineered features
     * @return Float array of features in model-expected order
     */
    private float[] buildFeatureArray(AnomalyContext ctx) {
        float[] features = new float[FEATURE_COUNT];
        
        for (int i = 0; i < featureOrder.size(); i++) {
            String featureName = featureOrder.get(i);
            double value = ctx.engineeredFeatures().getOrDefault(featureName, 0.0);
            
            // Validate the value is reasonable
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                log.warn("Invalid feature value for {}: {}, using 0.0", featureName, value);
                features[i] = 0.0f;
            } else {
                features[i] = (float) value;
            }
        }
        
        return features;
    }

    /**
     * Check if features are valid for scoring.
     * 
     * @param ctx The anomaly context
     * @return true if features contain valid numeric values
     */
    private boolean areValidFeatures(AnomalyContext ctx) {
        return ctx.engineeredFeatures() != null 
            && !ctx.engineeredFeatures().isEmpty()
            && featureOrder.stream()
                .allMatch(name -> ctx.engineeredFeatures().containsKey(name) 
                    || true); // Allow missing features (will use defaults)
    }

    /**
     * Get the feature order used by this service.
     * Useful for debugging and verification.
     * 
     * @return List of feature names in model order
     */
    public List<String> getFeatureOrder() {
        return featureOrder;
    }

    /**
     * Check if the model is properly initialized and ready for scoring.
     * 
     * @return true if model is loaded and ready, false otherwise
     */
    public boolean isReady() {
        return booster != null && featureOrder != null && !featureOrder.isEmpty();
    }
}

