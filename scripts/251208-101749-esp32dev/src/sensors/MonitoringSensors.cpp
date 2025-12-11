#include "MonitoringSensors.h"
#include "../display/DisplayManager.h"
#include "../network/mqtt/MQTTHandler.h"
#include "ISensor.h"
#include "SensorState.h"
#include "bmp180/BMP180Sensor.h"
#include "dht11/DHTSensor.h"
#include "ir/IRSensor.h"
#include "light/LightSensor.h"
#include "mq2/MQ2Sensor.h"
#include "pir/PIRSensor.h"
#include <Wire.h>

// Pins
#define PIN_DHT 26
#define PIN_MQ2 35
#define PIN_LIGHT 32
#define PIN_IR 33
#define PIN_PIR 13

// Create sensor objects
DHTSensor dhtSensor(PIN_DHT);
MQ2Sensor mq2Sensor(PIN_MQ2);
LightSensor lightSensor(PIN_LIGHT);
IRSensor irSensor(PIN_IR);
PIRSensor pirSensor(PIN_PIR);
BMP180Sensor bmp180Sensor;

// Create array of pointers to sensors
ISensor *sensors[] = {
    &dhtSensor,
    &mq2Sensor,
    &lightSensor,
    &irSensor,
    &bmp180Sensor,
    &pirSensor};

void initSensors() {
    // Init I2C with your custom pins
    Wire.begin(14, 27);
    for (ISensor *s : sensors) {
        s->init();
    }
    oled.begin();

    // Initialize sensor state management
    SensorStateManager::initDefaultConfigs();
    // Initialize device states for all configured devices
    std::vector<uint8_t> devices = SensorStateManager::listDeviceIds();
    for (uint8_t d : devices) {
        SensorStateManager::initDeviceState(d);
    }
}

void readAllSensors() {
    oled.clear();

    std::vector<String> unitsList; // all name:value[unit] as separate units
    std::vector<uint8_t> deviceIds = SensorStateManager::getDeviceIdListInOrder();
    size_t deviceIdIdx = 0; // Track position in device ID list

    for (size_t sensorIdx = 0; sensorIdx < sizeof(sensors) / sizeof(sensors[0]); sensorIdx++) {
        ISensor *s = sensors[sensorIdx];
        std::vector<float> values = s->read();
        std::vector<String> names = s->getMeasurementNames();
        std::vector<String> units = s->getUnits();

        if (values.empty()) {
            Serial.println("Sensor returned no values");
            unitsList.push_back("No data");
            continue;
        }

        for (size_t i = 0; i < values.size(); i++) {
            // Get deviceId from ordered list
            uint8_t deviceId = 0;
            if (deviceIdIdx < deviceIds.size()) {
                deviceId = deviceIds[deviceIdIdx];
                deviceIdIdx++;
            }

            if (deviceId != 0) {
                // Update sensor state by deviceId
                SensorStateManager::updateSensorDataByDevice(deviceId, values[i]);
            }

            String unitStr = "";
            if (!names.empty() && i < names.size())
                unitStr += names[i];
            unitStr += ":" + String(values[i], 1);
            if (!units.empty() && i < units.size())
                unitStr += units[i];

            unitsList.push_back(unitStr);
        }
    }

    // ----------- PRINT 2 UNITS PER OLED LINE --------------
    int line = 0;
    const int maxUnitsPerLine = 2;

    for (size_t i = 0; i < unitsList.size(); i += maxUnitsPerLine) {
        String lineText = unitsList[i];
        if (i + 1 < unitsList.size()) {
            lineText += " " + unitsList[i + 1];
        }
        oled.printLine(line, lineText);
        line++;
    }

    oled.show();
}

void publishPendingToMQTT() {
    // Iterate all configured devices
    std::vector<uint8_t> devices = SensorStateManager::listDeviceIds();
    for (uint8_t deviceId : devices) {
        if (SensorStateManager::shouldSendDataByDevice(deviceId)) {
            SensorMeasurementState *st = SensorStateManager::getStateByDevice(deviceId);
            if (st != nullptr) {
                Serial.print("  Device ");
                Serial.print(deviceId);
                Serial.println(" published");
                publishSensorValue(deviceId, st->lastValue);
                SensorStateManager::markDataSentByDevice(deviceId);
            }
        }
    }
}
