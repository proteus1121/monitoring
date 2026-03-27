# AI-Based Anomaly Detection System - Implementation Summary

## ✅ Completed Implementation

The AI-based anomaly detection system has been successfully integrated into the monitoring application. Here's what was implemented:

### Core Components

1. **Anomaly Detection Service** (`AnomalyDetectionService`)
   - Interface defining the contract for anomaly scoring
   - `XgboostAnomalyDetectionService`: In-process XGBoost model scoring with feature vector support

2. **Feature Engineering** (`FeatureBuilder`)
   - Transforms raw sensor readings into 12-dimensional feature vectors
   - Handles 9 base sensor features + 3 temporal delta features
   - Implements configurable default imputation for missing sensors

3. **LLM Integration** (`LocalLlmService`)
   - `OllamaLlmService`: Generates human-readable incident messages via local Ollama instance
   - `FallbackLlmService`: Template-based fallback when LLM is unavailable
   - Robust JSON parsing with retry mechanism (2 attempts)

4. **Sensor Aggregation** (`SensorReadingAggregationService`)
   - Gathers correlated sensor readings across all device types
   - Enables multi-sensor anomaly detection (e.g., high temp + low humidity + elevated LPG)

5. **Scheduled Predictions** (`AnomalyPredictionScheduler`)
   - Daily cron job at 00:00 UTC using Spring `@Scheduled`
   - Thread pool execution with (CPU_COUNT - 1) threads
   - Predicts metrics for devices with sufficient historical data (≥100 readings in 30 days)

### Configuration Properties

Added comprehensive configuration in `application.properties`:

```properties
# ML Anomaly Detection
ml.enabled=true
ml.modelPath=file:./models/environmental_xgb.json
ml.threshold=0.72
ml.provider=xgboost4j

# LLM (Ollama)
llm.enabled=true
llm.provider=ollama
llm.url=http://localhost:11434/api/generate
llm.model=llama3.1
llm.timeoutMs=2000

# Feature Engineering
features.windowMinutes=5
features.defaultImpute.temperature=22.0
features.defaultImpute.humidity=45.0
# ... (9 sensor defaults total)
```

### Integration with Existing Services

**MetricService (`checkValue` method)**:
- Attempts AI-based anomaly detection first
- Falls back to legacy threshold-based checks if ML is disabled or fails
- Maintains backward compatibility with existing alert logic

**Incident & Notification Flow**:
- Uses LLM-generated messages for incident titles
- Preserves existing notification system via TelegramNotificationService
- Creates incidents with CRITICAL severity when anomalies detected

### Database Enhancements

**SensorDataRepository** - Added queries:
- `findLatestByDeviceTypeInWindow()`: Fetch latest readings by sensor type
- `countByDeviceIdAndTimestampAfter()`: Check historical data availability

### Docker & Deployment

**Dockerfile Updates**:
- Added `libstdc++6`: C++ runtime for XGBoost
- Added `libomp-dev`: OpenMP support
- Added `gcc`: GCC runtime libraries
- Ensures XGBoost JNI libraries load correctly

### Testing

Created unit tests:
- `FeatureBuilderTest`: Tests feature vector construction, defaults, missing sensors
- `OllamaLlmServiceTest`: Tests fallback behavior and message generation

### Documentation

Created comprehensive documentation in `AI_ANOMALY_DETECTION.md`:
- Architecture overview
- Configuration guide (macOS & Docker)
- Feature engineering explanation
- Anomaly detection flow
- Troubleshooting guide
- Future enhancement roadmap

## 🔧 How It Works

### Real-Time Anomaly Detection Flow

1. **Sensor Reading Arrives** via MQTT
2. **Data Storage** in database
3. **Context Gathering**: Fetch latest readings for all 9 sensor types (5-minute window)
4. **Feature Engineering**: Build 12-dimensional feature vector
5. **XGBoost Scoring**: Get anomaly probability [0..1]
6. **Threshold Check**: If probability ≥ 0.72:
   - Generate LLM message describing the anomaly
   - Create incident record
   - Send Telegram notifications
7. **Fallback**: If ML fails, use legacy threshold detection

### Daily Predictions

**Runs at 00:00 UTC**:
1. Identify devices with ≥100 readings in last 30 days
2. Submit prediction tasks to thread pool
3. For each device:
   - Fetch 1 year of historical data
   - Train/update ensemble model
   - Generate predictions
   - Store predicted metrics

## 🚀 Configuration for Your Environment

### macOS Development Setup

```bash
# Install required libraries
brew install libomp gcc
export LDFLAGS="-L/usr/local/opt/libomp/lib"
export CPPFLAGS="-I/usr/local/opt/libomp/include"

# Start Ollama (for LLM features)
ollama serve
# In another terminal:
ollama pull llama3.1

# Build the project
./gradlew build

# Run the application
./gradlew bootRun
```

### Docker Setup

```bash
# The Dockerfile is already configured with all required dependencies

docker-compose up

# Or with environment overrides:
docker run -e ml.enabled=true \
           -e llm.enabled=true \
           -e llm.url=http://ollama:11434/api/generate \
           monitoring:latest
```

## 📋 File Structure

```
src/main/java/org/proteus1121/
├── config/properties/
│   ├── MlProperties.java          # ML configuration
│   ├── LlmProperties.java         # LLM configuration
│   └── FeatureProperties.java     # Feature engineering configuration
├── model/ml/
│   ├── AnomalyContext.java        # Anomaly scoring input context
│   ├── IncidentContext.java       # LLM message generation input
│   └── IncidentMessage.java       # LLM output (title + body)
├── service/ml/
│   ├── AnomalyDetectionService.java        # Scoring interface
│   ├── XgboostAnomalyDetectionService.java # XGBoost implementation
│   ├── LocalLlmService.java                # LLM interface
│   ├── OllamaLlmService.java               # Ollama implementation
│   ├── FallbackLlmService.java             # Template fallback
│   ├── FeatureBuilder.java                 # Feature engineering
│   ├── SensorReadingAggregationService.java # Multi-sensor aggregation
│   ├── AnomalyPredictionScheduler.java     # Daily cron scheduler
│   └── PredictableDevicesService.java      # Device selection for predictions
└── service/
    └── MetricService.java          # Updated with AI anomaly detection

src/test/java/org/proteus1121/service/ml/
├── FeatureBuilderTest.java         # Feature engineering tests
└── OllamaLlmServiceTest.java       # LLM service tests

Dockerfile                           # Updated with libomp support
application.properties               # Added ML/LLM configuration
AI_ANOMALY_DETECTION.md             # Comprehensive documentation
```

## 🎯 Key Features

✅ **Multi-Sensor Anomaly Detection**: Detects combinations like high temp + low humidity + elevated LPG  
✅ **Human-Readable Messages**: LLM generates actionable incident descriptions  
✅ **Resilient Fallback**: Gracefully degrades to threshold-based detection if ML unavailable  
✅ **Configurable Thresholds**: Easily adjust ML threshold and feature defaults  
✅ **Concurrent Predictions**: Thread pool handles daily batch predictions efficiently  
✅ **Backward Compatible**: Existing alert system unchanged, AI detection adds additional layer  
✅ **Comprehensive Logging**: DEBUG logs include feature vectors, timing, probabilities  
✅ **Docker Ready**: All dependencies configured for containerized deployment  

## 📊 Example Incident Message

When an anomaly is detected:

**Title**: "High temperature + low humidity alert"  
**Body**: "Detected combination of elevated temperature (35°C) and low humidity (20%) suggesting potential overheating. Check ventilation and cooling systems."

## ⚙️ Customization Points

1. **Model Path**: Update `ml.modelPath` to point to your trained XGBoost model
2. **Probability Threshold**: Adjust `ml.threshold` (0.72 default) based on tolerance
3. **Feature Defaults**: Modify `features.defaultImpute.*` to match your sensor ranges
4. **LLM Model**: Change `llm.model` to use different Ollama models
5. **Prediction Schedule**: Modify cron in `AnomalyPredictionScheduler`

## 🔍 Troubleshooting

**XGBoost model not loading**: Verify file at `./models/environmental_xgb.json` exists  
**No anomalies detected**: Check `ml.enabled=true` and lower `ml.threshold` if needed  
**Ollama connection fails**: Ensure Ollama running at `http://localhost:11434`  
**High false positives**: Increase `ml.threshold` to 0.75-0.80  

## ✨ Next Steps

1. Train/obtain an XGBoost model for your sensors and place at `./models/environmental_xgb.json`
2. Start Ollama instance (optional but recommended for better messages)
3. Configure `ml.threshold` based on your tolerance for false positives
4. Monitor logs for anomaly detection
5. Fine-tune feature defaults and thresholds based on actual data patterns

## 📚 Documentation

Full documentation available in `AI_ANOMALY_DETECTION.md` covering:
- Architecture deep dive
- Configuration options
- Feature engineering details
- Deployment guide
- Monitoring and observability
- Future enhancements

---

**Build Status**: ✅ SUCCESS  
**Project**: /Users/aishchen/IdeaProjects/monitoring  
**Java**: 17  
**Spring Boot**: 3.2.2

