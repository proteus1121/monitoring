# AI-Based Anomaly Detection System

## Overview

This document describes the AI-based environmental anomaly detection system that has been integrated into the monitoring application. The system uses XGBoost machine learning for multi-sensor anomaly detection and Ollama LLM for generating human-readable incident messages.

## Architecture

### Components

1. **Anomaly Detection Service** (`AnomalyDetectionService`)
   - Interface for anomaly scoring
   - Two implementations:
     - `XgboostAnomalyDetectionService`: In-process XGBoost model scoring
     - `ExternalModelAnomalyDetectionService`: HTTP-based external model (future)

2. **Feature Builder** (`FeatureBuilder`)
   - Transforms raw sensor readings into engineered features
   - Handles missing sensors with configurable defaults
   - Supports temporal features (deltas over time windows)

3. **LLM Service** (`LocalLlmService`)
   - Generates human-readable incident messages
   - Implementations:
     - `OllamaLlmService`: Uses local Ollama instance
     - `FallbackLlmService`: Template-based fallback

4. **Sensor Reading Aggregation** (`SensorReadingAggregationService`)
   - Gathers correlated sensor readings across device types
   - Implements location/group-based aggregation

5. **Prediction Scheduler** (`AnomalyPredictionScheduler`)
   - Runs daily predictions for all devices
   - Thread pool for concurrent execution
   - Optional hourly predictions for critical devices

## Configuration

### Application Properties

```properties
# ML Anomaly Detection Configuration
ml.enabled=true
ml.modelPath=file:./models/environmental_xgb.json
ml.threshold=0.72  # Anomaly probability threshold [0..1]
ml.provider=xgboost4j  # or 'external' for HTTP-based model
ml.external.url=http://localhost:8089/score
ml.external.timeoutMs=1200

# LLM Configuration (Ollama)
llm.enabled=true
llm.provider=ollama
llm.url=http://localhost:11434/api/generate
llm.model=llama3.1
llm.timeoutMs=2000

# Feature Engineering Configuration
features.windowMinutes=5
features.defaultImpute.temperature=22.0
features.defaultImpute.humidity=45.0
features.defaultImpute.lpg=0.0
features.defaultImpute.ch4=0.0
features.defaultImpute.smoke=0.0
features.defaultImpute.flame=0.0
features.defaultImpute.light=200.0
features.defaultImpute.pressure=1013.0
features.defaultImpute.motion=0.0
```

### Environment Setup

#### macOS (Development)

1. Install libomp for XGBoost:
```bash
brew install libomp gcc
export LDFLAGS="-L/usr/local/opt/libomp/lib"
export CPPFLAGS="-I/usr/local/opt/libomp/include"
```

2. Start Ollama (if using LLM):
```bash
ollama serve
# In another terminal:
ollama pull llama3.1
```

#### Docker (Production)

The Dockerfile has been updated to include:
- libstdc++6: C++ runtime library for XGBoost
- libomp-dev: OpenMP support for parallel processing
- gcc: GCC runtime

```dockerfile
RUN apt-get install -y --no-install-recommends \
      libgomp1 \
      libstdc++6 \
      libomp-dev \
      gcc
```

## Feature Engineering

### Feature Vector Structure

The system builds a feature vector with 12 features:

```
Base Features (9):
- temperature: Current temperature reading (°C)
- humidity: Current relative humidity (%)
- lpg: LPG gas concentration (ppm)
- ch4: Methane concentration (ppm)
- smoke: Smoke concentration
- flame: Flame detection (binary/confidence)
- light: Light intensity (lux)
- pressure: Atmospheric pressure (hPa)
- motion: Motion detection (binary/confidence)

Temporal Features (3):
- temp_delta_5m: Temperature change over 5 minutes
- humidity_delta_5m: Humidity change over 5 minutes
- lpg_delta_5m: LPG change over 5 minutes
```

### Missing Sensor Handling

When sensor data is unavailable, the system:
1. Uses configurable default values (see `features.defaultImpute.*`)
2. Records missing sensors in the incident context
3. Includes this information in LLM-generated messages

## Anomaly Detection Flow

### Detection Pipeline

1. **Data Collection**: Sensor reading arrives via MQTT
2. **Storage**: Reading saved to database
3. **Context Gathering**: 
   - Fetch latest readings for all sensor types (5-minute window)
   - Combine with current reading
4. **Feature Engineering**: Transform raw readings into features
5. **Model Scoring**: XGBoost predicts anomaly probability (0..1)
6. **Threshold Check**: If probability ≥ configured threshold:
   - Generate LLM message describing the anomaly
   - Create incident record
   - Send Telegram notifications
7. **Fallback**: If ML fails, revert to legacy threshold-based detection

### Anomaly Context

```java
AnomalyContext(
  deviceId: Long,
  deviceName: String,
  deviceType: DeviceType,
  locationId: String,
  latestValues: Map<DeviceType, Double>,
  engineeredFeatures: Map<String, Double>,
  missingSensors: List<DeviceType>
)
```

## LLM Message Generation

### Ollama Integration

The system connects to a local Ollama instance to generate human-readable incident messages:

```
System Prompt:
"You generate concise, actionable incident messages for IoT environmental anomalies.
Respond strictly as compact JSON: {"title": "...", "body": "..."}"

Example Output:
{
  "title": "High temperature + low humidity alert",
  "body": "Detected combination of elevated temperature (35°C) and low humidity (20%) suggesting potential overheating. Check ventilation and cooling systems."
}
```

### JSON Parsing and Retry

The system includes robust JSON parsing with:
- Automatic cleanup of markdown formatting
- Retry mechanism (2 attempts)
- Fallback to template-based messages

### Fallback Behavior

If Ollama is unavailable or LLM generation fails:
1. System falls back to template-based messages
2. Logs the error at WARNING level
3. Still creates incident and sends notifications

## Daily Prediction Job

### Scheduler Configuration

- **Trigger**: Daily at 00:00 UTC
- **Target**: All devices with sufficient historical data (≥100 readings in last 30 days)
- **Execution**: Thread pool with (CPU_COUNT - 1) threads
- **Prediction Window**: Last 365 days of data

### Cron Expression

```
0 0 0 * * *  (midnight daily)
```

### Implementation

```java
@Scheduled(cron = "0 0 0 * * *", zone = "UTC")
public void scheduleDailyPredictions() {
    var devices = predictableDevicesService.getAllPredictableDevices();
    for (Long deviceId : devices) {
        executorService.submit(() -> 
            metricService.predictMetrics(deviceId, startOfWindow)
        );
    }
}
```

## Resilience & Error Handling

### Model Scoring Failure
- Returns 0.0 (no anomaly)
- Logs error at ERROR level
- Falls back to threshold-based check

### LLM Generation Failure
- Uses fallback template message
- Logs warning at WARN level
- Still creates incident and notifies

### Timeouts
- XGBoost: Synchronous (no timeout, but fast ~10-100ms)
- Ollama: Configurable timeout (default 2000ms)
- External Model: Configurable timeout (default 1200ms)

## Monitoring & Observability

### Logging

Key log statements:

```
DEBUG: XGBoost scoring took XXms, probability: X.XXX, features: {...}
DEBUG: Built features from N sensor readings
WARN: AI anomaly detected for device X: probability=X.XXX, title='...'
WARN: Ollama LLM generation failed for device X: message
ERROR: XGBoost prediction failed for device X
```

### Metrics (Future Enhancement)

Recommended metrics to track:
- `ml.score.time`: Time taken for model scoring
- `ml.score.failures`: Count of scoring failures
- `llm.generate.time`: Time taken for message generation
- `llm.generate.failures`: Count of LLM failures
- `anomaly.detection.count`: Count of anomalies detected
- `anomaly.false_positives`: Est. false positive rate

## Testing

### Unit Tests

1. **FeatureBuilderTest**
   - Tests feature vector construction
   - Validates default imputation
   - Checks missing sensor detection

2. **OllamaLlmServiceTest**
   - Tests JSON parsing
   - Validates fallback behavior
   - Tests message formatting

3. **AnomalyDetectionServiceTest** (Future)
   - Tests scoring logic
   - Validates threshold behavior
   - Tests edge cases

### Integration Tests (Future)

- End-to-end anomaly detection flow
- Model loading and initialization
- LLM service integration
- Database queries

## Deployment

### Prerequisites

1. **XGBoost Model**: Place trained model at `./models/environmental_xgb.json`
2. **Ollama** (optional): 
   ```bash
   docker run -d -p 11434:11434 ollama/ollama
   ollama pull llama3.1
   ```
3. **System Libraries**: Automatically installed via Dockerfile

### Building

```bash
./gradlew build
docker build -t monitoring:latest .
```

### Running

```bash
# With Docker Compose
docker-compose up

# With environment variables
docker run -e ml.enabled=true \
           -e llm.enabled=true \
           -e llm.url=http://ollama:11434/api/generate \
           monitoring:latest
```

## Troubleshooting

### XGBoost Model Not Loading

**Error**: `Failed to load XGBoost model from ...`

**Solutions**:
- Verify model file exists at configured path
- Check file permissions
- Ensure model format is correct (XGBoost JSON)
- Verify JNI library loads: check libomp installation

### Ollama Connection Failed

**Error**: `Ollama returned null response`

**Solutions**:
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check timeout value in configuration
- Verify network connectivity
- Check Ollama logs: `ollama logs`

### No Anomalies Detected

**Possible Causes**:
1. ML disabled: Set `ml.enabled=true`
2. Threshold too high: Lower `ml.threshold` value
3. Model not loading: Check XGBoost initialization logs
4. Feature vector all zeros: Check sensor data is flowing

### High False Positive Rate

**Mitigation Strategies**:
1. Adjust `ml.threshold` upward (0.72 → 0.80)
2. Review trained model: May need retraining with better data
3. Adjust feature defaults: May not match actual sensor ranges
4. Implement post-processing: Filter by device type patterns

## Future Enhancements

1. **Advanced Feature Engineering**
   - Real temporal delta calculation (not just zeros)
   - Sensor correlation analysis
   - Trend detection features

2. **Model Management**
   - Dynamic model reloading
   - A/B testing multiple models
   - Model performance tracking

3. **Explainability**
   - SHAP feature importance
   - Anomaly reason extraction
   - User-facing explanations

4. **External Model Support**
   - HTTP-based model service
   - gRPC interface
   - Custom scoring logic

5. **Performance Optimization**
   - Batch prediction API
   - Caching layer
   - Async scoring

## References

- XGBoost4J Documentation: https://xgboost.readthedocs.io/en/latest/jvm/
- Ollama Documentation: https://github.com/ollama/ollama
- Feature Engineering: https://en.wikipedia.org/wiki/Feature_engineering

