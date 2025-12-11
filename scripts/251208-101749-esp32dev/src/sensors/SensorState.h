#ifndef SENSOR_STATE_H
#define SENSOR_STATE_H

#include <Arduino.h>
#include <map>
#include <vector>

struct SensorConfig {
    uint32_t sendDelay; // Delay between sends in milliseconds
    float minValue;     // Minimum acceptable value
    float maxValue;     // Maximum acceptable value
    uint8_t deviceId;   // Device identifier
};

struct SensorMeasurementState {
    float lastValue;
    uint32_t lastSentTime;
    bool isDirty; // Flag to track if value changed
};

class SensorStateManager {
private:
    // Map: deviceId -> config
    static std::map<uint8_t, SensorConfig> configs;
    // Map: deviceId -> state
    static std::map<uint8_t, SensorMeasurementState> states;

    // Default configuration table: {deviceId, sendDelay, minValue, maxValue}
    // Order defines sensor reading sequence
    static const SensorConfig DEFAULT_CONFIGS[];
    static const size_t DEFAULT_CONFIGS_COUNT;

public:
    // Initialize default configurations (device-keyed)
    static void initDefaultConfigs();

    // Get configuration by deviceId
    static SensorConfig *getConfigByDevice(uint8_t deviceId);

    // Initialize state entry for a device
    static void initDeviceState(uint8_t deviceId);

    // Update sensor data by deviceId
    static void updateSensorDataByDevice(uint8_t deviceId, float value);

    // Check if device data should be sent
    static bool shouldSendDataByDevice(uint8_t deviceId);

    // Mark device data as sent
    static void markDataSentByDevice(uint8_t deviceId);

    // Get device state
    static SensorMeasurementState *getStateByDevice(uint8_t deviceId);

    // List all configured deviceIds
    static std::vector<uint8_t> listDeviceIds();

    // List all deviceIds in sensor reading order (matches initDefaultConfigs order)
    static std::vector<uint8_t> getDeviceIdListInOrder();
};

#endif
