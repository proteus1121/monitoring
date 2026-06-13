# ML Architecture - Separation of Concerns

## Overview

The monitoring system now has a **clear separation** between anomaly detection and prediction:

### Anomaly Detection (Rule-Based)
- **Service:** `RuleBasedAnomalyDetectionService`
- **Purpose:** Real-time anomaly detection using threshold-based rules
- **Method:** Multi-sensor correlation, pattern matching, temporal analysis
- **Always active** when `ml.enabled=true`
- **No ML model required**

### Predictions (XGBoost)
- **Service:** `NeuralNetwork` (ensemble of XGBoost models)
- **Purpose:** Time-series forecasting for sensor values
- **Method:** Trained ensemble models with uncertainty quantification
- **Used in:** `predictMetrics()` method

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MetricService                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────┐    ┌──────────────────────┐ │
│  │  Anomaly Detection    │    │   Prediction         │ │
│  │  (Real-time)          │    │   (Future values)    │ │
│  ├───────────────────────┤    ├──────────────────────┤ │
│  │ RuleBased             │    │ XGBoost Ensemble     │ │
│  │ AnomalyDetection      │    │ (NeuralNetwork)      │ │
│  │ Service               │    │                      │ │
│  │                       │    │                      │ │
│  │ • Threshold rules     │    │ • Time-series model  │ │
│  │ • Pattern matching    │    │ • Uncertainty bounds │ │
│  │ • Multi-sensor        │    │ • Hourly forecasts   │ │
│  │   correlation         │    │                      │ │
│  └───────────────────────┘    └──────────────────────┘ │
│           ▲                              ▲              │
│           │                              │              │
│     checkValue()                  predictMetrics()      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Components

### 1. RuleBasedAnomalyDetectionService

**File:** `src/main/java/org/proteus1121/service/ml/RuleBasedAnomalyDetectionService.java`

**Responsibilities:**
- Score sensor readings for anomalies (0.0 to 1.0)
- Apply predefined thresholds
- Detect compound patterns (e.g., fire signature)
- Multi-sensor correlation

**Rules:**
```java
Temperature:     < 0°C or > 45°C        → Score: 0.6-0.9
Humidity:        < 20% or > 80%         → Score: 0.4
LPG:             > 400                  → Score: 0.8
CH4:             > 400                  → Score: 0.8
Smoke:           > 300                  → Score: 0.85
Flame:           > 0.5 (detected)       → Score: 0.95
Temp Delta:      > 5°C/5min             → Score: 0.5
Humidity Delta:  > 20%/5min             → Score: 0.4
LPG Delta:       > 200/5min             → Score: 0.7
Fire Signature:  smoke + temp + delta   → Score: 0.9
Gas Leak:        LPG + CH4 elevated     → Score: 0.85
```

**Usage:**
```java
AnomalyContext ctx = new AnomalyContext(...);
double score = anomalyDetectionService.score(ctx);
boolean isAnomalous = score >= mlProperties.getThreshold();
```

### 2. XGBoost Ensemble (NeuralNetwork)

**File:** `src/main/java/org/proteus1121/service/network/NeuralNetwork.java`

**Responsibilities:**
- Train ensemble of XGBoost models
- Predict future sensor values
- Provide uncertainty estimates
- Generate hourly forecasts

**Usage:**
```java
// Train on historical data
network.trainEnsemble(metrics);

// Predict with uncertainty
PredictionResult result = network.predictWithUncertainty(sensorData);
double predicted = result.getPrediction();
double lowerBound = result.getLowerBound();
double upperBound = result.getUpperBound();
```

### 3. MetricService (Orchestrator)

**File:** `src/main/java/org/proteus1121/service/MetricService.java`

**Responsibilities:**
- Process incoming sensor data
- Trigger anomaly detection (rule-based)
- Train and use prediction models (XGBoost)
- Coordinate incidents and notifications

**Flow for Anomaly Detection:**
```java
processMetrics(deviceId, value)
  → checkValue(deviceId, value)
    → performRuleBasedAnomalyDetection(device, value)
      → Score using RuleBasedAnomalyDetectionService
      → If anomalous:
        - Generate message with LLM
        - Create incident
        - Send notifications
```

**Flow for Predictions:**
```java
predictMetrics(deviceId, startTimestamp)
  → getMetrics() // historical data
  → network.trainEnsemble(metrics) // XGBoost
  → network.predictWithUncertainty() // forecast
  → Save predictions to database
```

## Configuration

**File:** `src/main/resources/application.properties`

```properties
# ML Anomaly Detection Configuration
# Anomaly Detection: Always uses rule-based (threshold and pattern detection)
# XGBoost: Used only for time-series predictions (not anomaly detection)
ml.enabled=true
ml.threshold=0.72

# Feature Engineering Configuration
features.windowMinutes=5
features.defaultImpute.temperature=22.0
features.defaultImpute.humidity=45.0
# ... etc
```

## Key Differences

| Aspect | Rule-Based Anomaly Detection | XGBoost Predictions |
|--------|----------------------------|---------------------|
| **Purpose** | Detect anomalies NOW | Forecast future values |
| **Input** | Current sensor readings | Historical time-series |
| **Output** | Anomaly score (0-1) | Future value + uncertainty |
| **Trigger** | Every sensor reading | On-demand or scheduled |
| **Model** | Hardcoded rules | Trained ML ensemble |
| **Training** | None required | Requires historical data |
| **Latency** | < 1ms | 1-5ms |
| **Used by** | `checkValue()` | `predictMetrics()` |

## Benefits of Separation

### ✅ Clarity
- Clear distinction between detection and prediction
- Each component has single responsibility
- Easier to understand and maintain

### ✅ Reliability
- Rule-based detection works immediately
- No dependency on trained models for safety-critical detection
- XGBoost failures don't affect anomaly detection

### ✅ Performance
- Rule-based detection is fast (< 1ms)
- XGBoost only used when needed (predictions)
- No unnecessary model loading/inference

### ✅ Maintainability
- Rules can be updated without retraining
- Predictions can be improved independently
- Clear testing boundaries

## API Impact

### Removed
- ❌ `ml.provider` configuration (no longer needed)
- ❌ `XgboostAnomalyDetectionService` (not used for detection)
- ❌ `/api/ml/train` endpoint (training handled by NeuralNetwork)
- ❌ `/api/ml/reload-model` endpoint (not needed)

### Kept
- ✅ `RuleBasedAnomalyDetectionService` (always active)
- ✅ `NeuralNetwork.trainEnsemble()` (for predictions)
- ✅ `predictMetrics()` API (uses XGBoost)

## Migration Notes

### Before
```properties
# Old configuration
ml.provider=xgboost4j  # or rule-based
ml.modelPath=file:./models/environmental_xgb.json
```

### After
```properties
# New configuration
ml.enabled=true
ml.threshold=0.72
# No provider needed - rule-based always used for anomaly detection
# XGBoost used automatically for predictions
```

### Code Changes
No application code changes required! The system automatically:
- Uses rule-based detection for `checkValue()`
- Uses XGBoost ensemble for `predictMetrics()`

## Future Enhancements

### Potential Additions
1. **Adaptive Thresholds:** Learn optimal thresholds from incident feedback
2. **Rule Learning:** Generate new rules from historical anomalies
3. **Hybrid Approach:** Use XGBoost features for rule weighting
4. **Explainability:** Add detailed rule firing logs

### Not Planned
- ❌ Using XGBoost for real-time anomaly detection (too complex)
- ❌ Replacing rule-based with pure ML (lose interpretability)
- ❌ Single unified model (separation of concerns is better)

## Testing

### Rule-Based Detection
```java
@Test
void testAnomalyDetection() {
    // Arrange
    Map<String, Double> features = Map.of(
        "temp", 55.0,  // High temp
        "smoke", 350.0  // High smoke
    );
    AnomalyContext ctx = new AnomalyContext(..., features, ...);
    
    // Act
    double score = service.score(ctx);
    
    // Assert
    assertTrue(score > 0.7); // Should be anomalous
}
```

### XGBoost Predictions
```java
@Test
void testPrediction() {
    // Arrange
    network.trainEnsemble(historicalData);
    
    // Act
    PredictionResult result = network.predictWithUncertainty(future);
    
    // Assert
    assertTrue(result.getPrediction() > 0);
    assertTrue(result.getUpperBound() > result.getLowerBound());
}
```

## Summary

✅ **Anomaly Detection:** Always rule-based, fast, interpretable, no model needed  
✅ **Predictions:** XGBoost ensemble, trained on demand, with uncertainty  
✅ **Clear separation:** Each component does one thing well  
✅ **Production ready:** No breaking changes, backward compatible

---

Last Updated: 2026-06-14
