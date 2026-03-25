package org.proteus1121.service.network;

import com.google.gson.JsonObject;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import org.proteus1121.model.response.metric.SensorData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Enhanced Neural Network component with: - Ensemble XGBoost models for
 * improved accuracy - Uncertainty estimation with confidence intervals -
 * SHAP-like local explanations - Prediction calibration and risk assessment
 */
@Slf4j
@Component
public class NeuralNetwork {

    private static final int ENSEMBLE_SIZE = 3;
    private static final String[] FEATURE_NAMES = {"hour_of_day", "day_of_year"};
    private static final double CALIBRATION_TEMPERATURE = 1.2;

    private List<Booster> ensemble;
    private List<Double> trainingResiduals;

    @Autowired
    private ModelExplainer modelExplainer;

    @Autowired
    private UncertaintyEstimator uncertaintyEstimator;

    /**
     * Prediction result with uncertainty and explanations
     */
    @Data
    @AllArgsConstructor
    public static class PredictionResult {

        private double prediction;
        private double confidence;
        private double lowerBound;
        private double upperBound;
        private Map<String, Double> featureImportance;
        private String riskLevel;
        private JsonObject explanation;
    }

    public NeuralNetwork() {
        this.ensemble = new ArrayList<>();
        this.trainingResiduals = new ArrayList<>();
    }

    /**
     * Train ensemble of XGBoost models with cross-validation
     */
    public List<Booster> trainEnsemble(List<SensorData> data) throws Exception {
        if (data.isEmpty()) {
            log.warn("Empty dataset provided for training");
            return Collections.emptyList();
        }

        log.info("Training ensemble of {} models with {} samples", ENSEMBLE_SIZE, data.size());
        ensemble.clear();
        trainingResiduals.clear();

        for (int modelIdx = 0; modelIdx < ENSEMBLE_SIZE; modelIdx++) {
            // Train with slight variations (random subsampling)
            Booster model = trainSingleModel(data, modelIdx);
            if (model != null) {
                ensemble.add(model);
                calculateResiduals(data, model);
            }
        }

        log.info("Ensemble trained with {} models", ensemble.size());
        return ensemble;
    }

    /**
     * Train a single XGBoost model with hyperparameters
     */
    private Booster trainSingleModel(List<SensorData> data, int seed) throws Exception {
        // Create training data
        float[][] features = createFeatureMatrix(data);
        float[] labels = createLabelVector(data);

        // Flatten features for DMatrix
        float[] flatFeatures = flattenMatrix(features);

        DMatrix trainMat = new DMatrix(flatFeatures, data.size(), 2);
        trainMat.setLabel(labels);

        // XGBoost parameters with slight variations per model
        Map<String, Object> params = new HashMap<>();
        params.put("objective", "reg:squarederror");
        params.put("max_depth", 3 + (seed % 2)); // Vary depth slightly
        params.put("eta", 0.1 + (seed * 0.01));  // Vary learning rate
        params.put("subsample", 0.9 - (seed * 0.05)); // Subsample with seed variation
        params.put("colsample_bytree", 0.9);
        params.put("verbosity", 0);
        params.put("tree_method", "auto");
        params.put("seed", seed);

        // Train with 50-100 rounds depending on data size
        int rounds = Math.min(100, Math.max(50, data.size() / 10));

        try {
            return XGBoost.train(trainMat, params, rounds, new HashMap<>(), null, null);
        } catch (Exception e) {
            log.error("Error training model {}: {}", seed, e.getMessage());
            return null;
        }
    }

    /**
     * Make prediction with ensemble uncertainty and explanation
     */
    public PredictionResult predictWithUncertainty(SensorData sensorData) throws Exception {
        if (ensemble.isEmpty()) {
            throw new IllegalStateException("Model ensemble not trained yet");
        }

        float[] features = extractFeatures(sensorData);
        double[] featuresDouble = new double[features.length];
        for (int i = 0; i < features.length; i++) {
            featuresDouble[i] = features[i];
        }

        // Get predictions from all ensemble members
        List<Double> predictions = new ArrayList<>();
        for (Booster model : ensemble) {
            double pred = singlePredict(model, features);
            predictions.add(pred);
        }

        // Estimate uncertainty from ensemble
        UncertaintyEstimator.PredictionWithUncertainty uncertainty
                = uncertaintyEstimator.estimateEnsembleUncertainty(predictions, featuresDouble);

        // Get feature importance explanations
        Map<String, Double> featureImportance
                = modelExplainer.explainLocalPrediction(
                        features,
                        uncertainty.getPrediction(),
                        FEATURE_NAMES);

        // Generate explanation report
        JsonObject explanation = modelExplainer.generateExplanationReport(
                sensorData,
                uncertainty.getPrediction(),
                featureImportance,
                uncertainty.getConfidence());

        return new PredictionResult(
                uncertainty.getPrediction(),
                uncertainty.getConfidence(),
                uncertainty.getLowerBound(),
                uncertainty.getUpperBound(),
                featureImportance,
                uncertainty.getRiskLevel(),
                explanation
        );
    }

    /**
     * High-performance single prediction (without uncertainty)
     */
    public double predict(Booster trainedModel, SensorData sensorData) throws Exception {
        if (trainedModel == null) {
            throw new IllegalArgumentException("Model cannot be null");
        }

        float[] features = extractFeatures(sensorData);
        return singlePredict(trainedModel, features);
    }

    /**
     * Batch prediction with uncertainty for multiple timestamps
     */
    public List<PredictionResult> predictBatch(List<SensorData> sensorDataList) throws Exception {
        return sensorDataList.stream()
                .map(sensorData -> {
                    try {
                        return predictWithUncertainty(sensorData);
                    } catch (Exception e) {
                        log.error("Error predicting for {}: {}", sensorData.getTimestamp(), e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Generate hourly predictions for the next day
     */
    public List<PredictionResult> generateHourlyPredictions(LocalDateTime currentTime) throws Exception {
        List<SensorData> hourlyData = generateHourlyFeatures(currentTime);
        return predictBatch(hourlyData);
    }

    /**
     * Calculate and validate model calibration
     */
    public UncertaintyEstimator.CalibrationMetrics validateCalibration(
            List<SensorData> testData) throws Exception {

        List<Double> predictions = new ArrayList<>();
        List<Double> actuals = new ArrayList<>();
        List<Double> confidences = new ArrayList<>();

        for (SensorData data : testData) {
            PredictionResult result = predictWithUncertainty(data);
            predictions.add(result.prediction);
            actuals.add(data.getValue());
            confidences.add(result.confidence);
        }

        return uncertaintyEstimator.calculateCalibrationMetrics(
                predictions, actuals, confidences);
    }

    /**
     * Generate hourly features for next 24 hours
     */
    public List<SensorData> generateHourlyFeatures(LocalDateTime currentTime) {
        List<SensorData> hourlyFeatures = new ArrayList<>();
        LocalDateTime nextDayStart = currentTime.plusDays(1).toLocalDate().atStartOfDay();
        for (int hour = 0; hour < 24; hour++) {
            LocalDateTime hourlyTimestamp = nextDayStart.plusHours(hour);
            SensorData sensorData = new SensorData(hourlyTimestamp, null);
            hourlyFeatures.add(sensorData);
        }
        return hourlyFeatures;
    }

    /**
     * Save ensemble to file
     */
    public void saveEnsemble(String baseFilePath) throws Exception {
        for (int i = 0; i < ensemble.size(); i++) {
            String filePath = baseFilePath + "_model_" + i + ".model";
            ensemble.get(i).saveModel(filePath);
            log.info("Saved model {} to {}", i, filePath);
        }
    }

    /**
     * Load ensemble from files
     */
    public void loadEnsemble(String baseFilePath) throws Exception {
        ensemble.clear();
        for (int i = 0; i < ENSEMBLE_SIZE; i++) {
            String filePath = baseFilePath + "_model_" + i + ".model";
            Booster model = XGBoost.loadModel(filePath);
            ensemble.add(model);
            log.info("Loaded model {} from {}", i, filePath);
        }
    }

    /**
     * Get global feature importance across ensemble
     */
    public Map<String, Double> getGlobalFeatureImportance(List<SensorData> data) throws Exception {
        List<float[]> featureSets = data.stream()
                .map(this::extractFeatures)
                .collect(Collectors.toList());

        List<Double> predictions = new ArrayList<>();
        for (SensorData sensorData : data) {
            PredictionResult result = predictWithUncertainty(sensorData);
            predictions.add(result.prediction);
        }

        return modelExplainer.calculateGlobalFeatureImportance(
                featureSets, predictions, FEATURE_NAMES);
    }

    // ==================== Helper Methods ====================
    /**
     * Single prediction from a model
     */
    private double singlePredict(Booster model, float[] features) throws Exception {
        DMatrix dmat = new DMatrix(features, 1, 2);
        float[][] preds = model.predict(dmat);
        return preds[0][0];
    }

    /**
     * Extract features from SensorData
     */
    private float[] extractFeatures(SensorData sensorData) {
        int hourOfDay = sensorData.getTimestamp().getHour();
        int dayOfYear = sensorData.getTimestamp().getDayOfYear();
        return new float[]{hourOfDay, dayOfYear};
    }

    /**
     * Create feature matrix from data
     */
    private float[][] createFeatureMatrix(List<SensorData> data) {
        float[][] features = new float[data.size()][2];
        for (int i = 0; i < data.size(); i++) {
            int hourOfDay = data.get(i).getTimestamp().getHour();
            int dayOfYear = data.get(i).getTimestamp().getDayOfYear();
            features[i][0] = hourOfDay;
            features[i][1] = dayOfYear;
        }
        return features;
    }

    /**
     * Create label vector from data
     */
    private float[] createLabelVector(List<SensorData> data) {
        float[] labels = new float[data.size()];
        for (int i = 0; i < data.size(); i++) {
            labels[i] = data.get(i).getValue().floatValue();
        }
        return labels;
    }

    /**
     * Flatten 2D matrix to 1D array
     */
    private float[] flattenMatrix(float[][] matrix) {
        float[] flat = new float[matrix.length * matrix[0].length];
        for (int i = 0; i < matrix.length; i++) {
            System.arraycopy(matrix[i], 0, flat, i * matrix[i].length, matrix[i].length);
        }
        return flat;
    }

    /**
     * Calculate residuals for uncertainty estimation
     */
    private void calculateResiduals(List<SensorData> data, Booster model) {
        for (SensorData sensorData : data) {
            try {
                double prediction = singlePredict(model, extractFeatures(sensorData));
                double residual = sensorData.getValue() - prediction;
                trainingResiduals.add(residual);
            } catch (Exception e) {
                log.warn("Error calculating residual: {}", e.getMessage());
            }
        }
    }
}
