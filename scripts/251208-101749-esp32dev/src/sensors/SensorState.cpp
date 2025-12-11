#include "SensorState.h"

// Single source of truth: device configuration table in sensor reading order
// {sendDelay_ms, minValue, maxValue, deviceId}
const SensorConfig SensorStateManager::DEFAULT_CONFIGS[] = {
    // DHT: temp, humidity
    {5000, 0.0f, 50.0f, 8},   // deviceId 8: temp
    {10000, 0.0f, 100.0f, 9}, // deviceId 9: humidity
    // MQ2: LPG, CH4, Smoke
    {15000, 0.0f, 1000.0f, 42}, // deviceId 42: LPG
    {15000, 0.0f, 1000.0f, 43}, // deviceId 43: CH4
    {15000, 0.0f, 1000.0f, 44}, // deviceId 44: Smoke
    // Light
    {5000, 0.0f, 100.0f, 46}, // deviceId 46: Light
    // IR/Flame
    {5000, 0.0f, 100.0f, 45}, // deviceId 45: IR/Flame
    // BMP180: temp, pressure, altitude
    {10000, 0.0f, 100.0f, 47},       // deviceId 47: temp
    {10000, 900.0f, 1100.0f, 48},    // deviceId 48: pressure
    {10000, -1000.0f, 10000.0f, 49}, // deviceId 49: altitude
    // PIR: motion
    {5000, 0.0f, 1.0f, 50} // deviceId 50: motion
};
const size_t SensorStateManager::DEFAULT_CONFIGS_COUNT = sizeof(DEFAULT_CONFIGS) / sizeof(DEFAULT_CONFIGS[0]);

std::map<uint8_t, SensorConfig> SensorStateManager::configs;
std::map<uint8_t, SensorMeasurementState> SensorStateManager::states;

void SensorStateManager::initDefaultConfigs() {
    // Populate device-keyed configs from the default table
    configs.clear();
    for (size_t i = 0; i < DEFAULT_CONFIGS_COUNT; i++) {
        const SensorConfig &cfg = DEFAULT_CONFIGS[i];
        configs[cfg.deviceId] = cfg;
    }

    // Initialize states map with defaults
    for (const auto &entry : configs) {
        states[entry.first] = {0.0f, 0, true};
    }
}

SensorConfig *SensorStateManager::getConfigByDevice(uint8_t deviceId) {
    auto it = configs.find(deviceId);
    if (it != configs.end())
        return &it->second;
    return nullptr;
}

void SensorStateManager::initDeviceState(uint8_t deviceId) {
    if (states.find(deviceId) == states.end()) {
        states[deviceId] = {0.0f, 0, true};
    }
}

void SensorStateManager::updateSensorDataByDevice(uint8_t deviceId, float value) {
    auto sit = states.find(deviceId);
    if (sit == states.end())
        return;

    SensorMeasurementState &data = sit->second;
    if (data.lastValue != value) {
        data.lastValue = value;
        data.isDirty = true;
    }
}

bool SensorStateManager::shouldSendDataByDevice(uint8_t deviceId) {
    SensorConfig *config = getConfigByDevice(deviceId);
    auto sit = states.find(deviceId);
    if (config == nullptr || sit == states.end())
        return false;

    SensorMeasurementState &state = sit->second;
    uint32_t timeSinceLastSend = millis() - state.lastSentTime;

    bool isFirstSend = (state.lastSentTime == 0);
    bool delayOk = (timeSinceLastSend >= config->sendDelay);
    return isFirstSend || (delayOk && state.isDirty);
}

void SensorStateManager::markDataSentByDevice(uint8_t deviceId) {
    auto sit = states.find(deviceId);
    if (sit != states.end()) {
        sit->second.lastSentTime = millis();
        sit->second.isDirty = false;
    }
}

SensorMeasurementState *SensorStateManager::getStateByDevice(uint8_t deviceId) {
    auto sit = states.find(deviceId);
    if (sit != states.end())
        return &sit->second;
    return nullptr;
}

std::vector<uint8_t> SensorStateManager::listDeviceIds() {
    std::vector<uint8_t> out;
    for (const auto &entry : configs)
        out.push_back(entry.first);
    return out;
}

std::vector<uint8_t> SensorStateManager::getDeviceIdListInOrder() {
    // Return device IDs in the order defined by DEFAULT_CONFIGS
    std::vector<uint8_t> out;
    for (size_t i = 0; i < DEFAULT_CONFIGS_COUNT; i++) {
        out.push_back(DEFAULT_CONFIGS[i].deviceId);
    }
    return out;
}
