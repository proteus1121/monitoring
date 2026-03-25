package org.proteus1121.service.network;

import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.response.metric.SensorData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * High-level prediction service integrating: - Ensemble modeling - Uncertainty
 * estimation - XAI explanations - Risk assessment
 */
@Slf4j
@Service
public class PredictionService {

    @Autowired
    private NeuralNetwork neuralNetwork;

    @Autowired
    private ModelExplainer modelExplainer;

    @Autowired
    private UncertaintyEstimator uncertaintyEstimator;

    /**
     * Train ensemble models from sensor data
     */
    public void trainModels(List<SensorData> trainingData) throws Exception {
        log.info("Starting ensemble model training with {} samples", trainingData.size());
        neuralNetwork.trainEnsemble(trainingData);
        log.info("Ensemble training completed");
    }

    /**
     * Make prediction with complete analysis
     */
    public PredictionAnalysis analyzePrediction(SensorData sensorData) throws Exception {
        NeuralNetwork.PredictionResult result = neuralNetwork.predictWithUncertainty(sensorData);

        boolean isAnomalous = detectAnomaly(result);
        String alert = generateAlert(result, isAnomalous);

        return new PredictionAnalysis(
                result.getPrediction(),
                result.getConfidence(),
                result.getLowerBound(),
                result.getUpperBound(),
                result.getRiskLevel(),
                result.getFeatureImportance(),
                result.getExplanation(),
                isAnomalous,
                alert
        );
    }

    /**
     * Generate hourly forecast with uncertainty
     */
    public List<NeuralNetwork.PredictionResult> forecast24Hours(LocalDateTime baseTime) throws Exception {
        log.info("Generating 24-hour forecast from {}", baseTime);
        return neuralNetwork.generateHourlyPredictions(baseTime);
    }

    /**
     * Validate model calibration on test set
     */
    public CalibrationReport validateModel(List<SensorData> testData) throws Exception {
        UncertaintyEstimator.CalibrationMetrics metrics
                = neuralNetwork.validateCalibration(testData);

        return new CalibrationReport(
                metrics.getCalibrationError(),
                metrics.getExpectedCalibrationError(),
                metrics.isWellCalibrated(),
                metrics.getConfidenceIntervals()
        );
    }

    /**
     * Get feature importance analysis
     */
    public Map<String, Double> getFeatureImportance(List<SensorData> data) throws Exception {
        return neuralNetwork.getGlobalFeatureImportance(data);
    }

    /**
     * Save trained models
     */
    public void saveModels(String basePath) throws Exception {
        neuralNetwork.saveEnsemble(basePath);
        log.info("Models saved to {}", basePath);
    }

    /**
     * Load trained models
     */
    public void loadModels(String basePath) throws Exception {
        neuralNetwork.loadEnsemble(basePath);
        log.info("Models loaded from {}", basePath);
    }

    /**
     * Detect anomalies based on prediction and uncertainty
     */
    private boolean detectAnomaly(NeuralNetwork.PredictionResult result) {
        // Anomaly if:
        // 1. Low confidence with high uncertainty
        // 2. Risk level is HIGH
        // 3. Prediction deviates significantly from bounds

        return "HIGH".equals(result.getRiskLevel())
                || result.getConfidence() < 0.3;
    }

    /**
     * Generate human-readable alert message
     */
    private String generateAlert(NeuralNetwork.PredictionResult result, boolean isAnomalous) {
        if (!isAnomalous) {
            return null;
        }

        StringBuilder alert = new StringBuilder();
        alert.append("⚠️ ALERT - ");

        if ("HIGH".equals(result.getRiskLevel())) {
            alert.append("High risk prediction detected. ");
        }

        if (result.getConfidence() < 0.3) {
            alert.append("Low confidence in prediction. ");
        }

        alert.append(String.format("Expected value: %.2f (±%.2f), Confidence: %.2f",
                result.getPrediction(),
                (result.getUpperBound() - result.getLowerBound()) / 2,
                result.getConfidence()));

        return alert.toString();
    }

    /**
     * Analysis result with prediction and alerts
     */
    public static class PredictionAnalysis {

        public final double value;
        public final double confidence;
        public final double lowerBound;
        public final double upperBound;
        public final String riskLevel;
        public final Map<String, Double> importance;
        public final JsonObject explanation;
        public final boolean isAnomalous;
        public final String alert;

        public PredictionAnalysis(double value, double confidence, double lowerBound,
                double upperBound, String riskLevel,
                Map<String, Double> importance, JsonObject explanation,
                boolean isAnomalous, String alert) {
            this.value = value;
            this.confidence = confidence;
            this.lowerBound = lowerBound;
            this.upperBound = upperBound;
            this.riskLevel = riskLevel;
            this.importance = importance;
            this.explanation = explanation;
            this.isAnomalous = isAnomalous;
            this.alert = alert;
        }
    }

    /**
     * Model calibration report
     */
    public static class CalibrationReport {

        public final double calibrationError;
        public final double expectedCalibrationError;
        public final boolean isWellCalibrated;
        public final double[] confidenceIntervals;

        public CalibrationReport(double calibrationError, double expectedCalibrationError,
                boolean isWellCalibrated, double[] confidenceIntervals) {
            this.calibrationError = calibrationError;
            this.expectedCalibrationError = expectedCalibrationError;
            this.isWellCalibrated = isWellCalibrated;
            this.confidenceIntervals = confidenceIntervals;
        }
    }
}
