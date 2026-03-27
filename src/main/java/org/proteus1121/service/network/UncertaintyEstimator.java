package org.proteus1121.service.network;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Uncertainty Estimator for predictions Provides calibration, confidence
 * intervals, and ensemble-based uncertainty
 */
@Slf4j
@Component
public class UncertaintyEstimator {

    /**
     * Prediction with uncertainty bounds
     */
    @Data
    @AllArgsConstructor
    public static class PredictionWithUncertainty {

        private double prediction;
        private double confidence;
        private double lowerBound;
        private double upperBound;
        private double stdDev;
        private String riskLevel;
    }

    /**
     * Calibration metrics for model validation
     */
    @Data
    @AllArgsConstructor
    public static class CalibrationMetrics {

        private double calibrationError;
        private double expectedCalibrationError;
        private double[] confidenceIntervals;
        private boolean isWellCalibrated;
    }

    private static final double Z_SCORE_95 = 1.96; // For 95% confidence interval
    private static final double BASELINE_UNCERTAINTY = 0.15;

    /**
     * Estimate uncertainty for a single prediction
     */
    public PredictionWithUncertainty estimateUncertainty(
            double prediction,
            double[] features,
            List<Double> trainingResiduals) {

        // Calculate standard deviation from training residuals
        double stdDev = calculateStdDev(trainingResiduals);

        // Adjust uncertainty based on feature values (heteroscedastic uncertainty)
        double adjustedStdDev = adjustUncertaintyByFeatures(stdDev, features);

        // Calculate confidence interval
        double marginOfError = Z_SCORE_95 * adjustedStdDev;
        double lowerBound = prediction - marginOfError;
        double upperBound = prediction + marginOfError;

        // Calculate confidence (inverse of relative standard deviation)
        double confidence = calculateConfidence(adjustedStdDev, Math.abs(prediction));

        // Determine risk level
        String riskLevel = determineRiskLevel(prediction, confidence, adjustedStdDev);

        return new PredictionWithUncertainty(
                prediction,
                confidence,
                lowerBound,
                upperBound,
                adjustedStdDev,
                riskLevel
        );
    }

    /**
     * Calibrate predictions using Platt scaling (Temperature scaling for modern
     * neural networks)
     */
    public double calibratePrediction(double rawPrediction, double calibrationTemperature) {
        // Temperature scaling: softmax temperature
        if (calibrationTemperature <= 0) {
            return rawPrediction;
        }

        // For regression, apply temperature scaling
        return rawPrediction / calibrationTemperature;
    }

    /**
     * Calculate calibration metrics
     */
    public CalibrationMetrics calculateCalibrationMetrics(
            List<Double> predictions,
            List<Double> actualValues,
            List<Double> confidences) {

        if (predictions.size() != actualValues.size()) {
            log.warn("Predictions and actual values size mismatch");
            return new CalibrationMetrics(Double.NaN, Double.NaN, new double[0], false);
        }

        // Calculate calibration error (MAE between predictions and actuals)
        double calibrationError = calculateMeanAbsoluteError(predictions, actualValues);

        // Expected Calibration Error (ECE)
        double expectedCalibrationError = calculateExpectedCalibrationError(
                predictions, actualValues, confidences);

        // Confidence intervals accuracy
        double[] confidenceIntervals = calculateConfidenceIntervalMetrics(
                predictions, actualValues, confidences);

        // Check if model is well-calibrated (ECE < 0.1)
        boolean isWellCalibrated = expectedCalibrationError < 0.1;

        return new CalibrationMetrics(
                calibrationError,
                expectedCalibrationError,
                confidenceIntervals,
                isWellCalibrated
        );
    }

    /**
     * Ensemble uncertainty estimation from multiple model predictions
     */
    public PredictionWithUncertainty estimateEnsembleUncertainty(
            List<Double> predictions,
            double[] features) {

        // Calculate mean prediction
        double meanPrediction = predictions.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        // Calculate variance among ensemble members (model disagreement)
        double ensembleVariance = predictions.stream()
                .mapToDouble(pred -> Math.pow(pred - meanPrediction, 2))
                .average()
                .orElse(0.0);

        double stdDev = Math.sqrt(ensembleVariance);
        double adjustedStdDev = adjustUncertaintyByFeatures(stdDev, features);

        // Calculate confidence
        double confidence = calculateConfidence(adjustedStdDev, Math.abs(meanPrediction));

        // Confidence interval
        double marginOfError = Z_SCORE_95 * adjustedStdDev;
        double lowerBound = meanPrediction - marginOfError;
        double upperBound = meanPrediction + marginOfError;

        String riskLevel = determineRiskLevel(meanPrediction, confidence, adjustedStdDev);

        return new PredictionWithUncertainty(
                meanPrediction,
                confidence,
                lowerBound,
                upperBound,
                adjustedStdDev,
                riskLevel
        );
    }

    /**
     * Bayesian confidence intervals
     */
    public double[] calculateBayesianConfidenceInterval(
            double prediction,
            double priorMean,
            double priorStdDev,
            double likelihood,
            double dataVariance,
            double confidence) {

        // Posterior variance (simplified Bayesian update)
        double posteriorVariance = 1.0 / (1.0 / (priorStdDev * priorStdDev) + 1.0 / dataVariance);
        double posteriorStdDev = Math.sqrt(posteriorVariance);

        // Posterior mean
        double posteriorMean = (priorMean / (priorStdDev * priorStdDev)
                + prediction / dataVariance) * posteriorVariance;

        // Confidence interval bounds
        double zScore = getZScoreForConfidence(confidence);
        double lowerBound = posteriorMean - zScore * posteriorStdDev;
        double upperBound = posteriorMean + zScore * posteriorStdDev;

        return new double[]{lowerBound, posteriorMean, upperBound};
    }

    /**
     * Adaptive uncertainty based on input features (Heteroscedastic uncertainty
     * modeling)
     */
    private double adjustUncertaintyByFeatures(double baseStdDev, double[] features) {
        double uncertaintyMultiplier = 1.0;

        // Increase uncertainty at extremes (e.g., edge hours)
        if (features.length > 0) {
            double hourOfDay = features[0];
            if (hourOfDay < 4 || hourOfDay > 22) {
                uncertaintyMultiplier *= 1.5; // Higher uncertainty outside normal hours
            }
        }

        return baseStdDev * uncertaintyMultiplier;
    }

    /**
     * Calculate confidence score (0-1)
     */
    private double calculateConfidence(double stdDev, double predictionMagnitude) {
        // Confidence decreases with larger standard deviation
        // Normalized by prediction magnitude
        double relativeStdDev = stdDev / Math.max(predictionMagnitude, 1.0);
        return Math.max(0.0, 1.0 - Math.min(relativeStdDev, 1.0));
    }

    /**
     * Determine risk level based on prediction and uncertainty
     */
    private String determineRiskLevel(double prediction, double confidence, double stdDev) {
        if (confidence < 0.5 || stdDev > 0.3) {
            return "HIGH";
        } else if (confidence < 0.7 || stdDev > 0.15) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }

    /**
     * Calculate standard deviation from residuals
     */
    private double calculateStdDev(List<Double> values) {
        if (values.isEmpty()) {
            return BASELINE_UNCERTAINTY;
        }

        double mean = values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        double variance = values.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average()
                .orElse(0.0);

        return Math.sqrt(variance);
    }

    /**
     * Calculate Mean Absolute Error
     */
    private double calculateMeanAbsoluteError(List<Double> predictions, List<Double> actuals) {
        double sumError = 0.0;
        for (int i = 0; i < predictions.size(); i++) {
            sumError += Math.abs(predictions.get(i) - actuals.get(i));
        }
        return predictions.isEmpty() ? 0.0 : sumError / predictions.size();
    }

    /**
     * Calculate Expected Calibration Error
     */
    private double calculateExpectedCalibrationError(
            List<Double> predictions,
            List<Double> actuals,
            List<Double> confidences) {

        // Bin predictions by confidence
        int numBins = 10;
        double[] binAccuracy = new double[numBins];
        double[] binConfidence = new double[numBins];
        long[] binCounts = new long[numBins];

        for (int i = 0; i < predictions.size(); i++) {
            int binIdx = Math.min((int) (confidences.get(i) * numBins), numBins - 1);
            binConfidence[binIdx] += confidences.get(i);
            binAccuracy[binIdx] += (Math.abs(predictions.get(i) - actuals.get(i)) < 1.0) ? 1 : 0;
            binCounts[binIdx]++;
        }

        // Calculate ECE
        double ece = 0.0;
        for (int i = 0; i < numBins; i++) {
            if (binCounts[i] > 0) {
                double avgAccuracy = binAccuracy[i] / binCounts[i];
                double avgConfidence = binConfidence[i] / binCounts[i];
                ece += (binCounts[i] / (double) predictions.size())
                        * Math.abs(avgAccuracy - avgConfidence);
            }
        }

        return ece;
    }

    /**
     * Calculate confidence interval metrics
     */
    private double[] calculateConfidenceIntervalMetrics(
            List<Double> predictions,
            List<Double> actuals,
            List<Double> confidences) {

        int covered = 0;
        for (int i = 0; i < predictions.size(); i++) {
            double margin = Z_SCORE_95 * (1 - confidences.get(i));
            double lower = predictions.get(i) - margin;
            double upper = predictions.get(i) + margin;

            if (actuals.get(i) >= lower && actuals.get(i) <= upper) {
                covered++;
            }
        }

        double coverageRate = covered / (double) predictions.size();
        return new double[]{coverageRate};
    }

    /**
     * Get Z-score for given confidence level
     */
    private double getZScoreForConfidence(double confidence) {
        if (confidence >= 0.95) {
            return 1.96;  // 95% CI

                }if (confidence >= 0.90) {
            return 1.645; // 90% CI

                }if (confidence >= 0.80) {
            return 1.28;  // 80% CI

                }return 1.0; // Default
    }
}
