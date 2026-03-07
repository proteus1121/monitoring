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

#ifdef USE_U8G2
#include <U8g2lib.h>
#endif

#include "pir/PIRSensor.h"

// include the appropriate WiFi header for each platform
#if defined(ESP8266)
#include <ESP8266WiFi.h>
#elif defined(ESP32)
#include <WiFi.h>
#else
#warning "Unknown Arduino-compatible board, please provide correct WiFi include."
#endif

#include <Wire.h>
#include <vector>

// pointers to concrete sensor instances; allocated in initSensors().
static DHTSensor *dhtSensor = nullptr;
static MQ2Sensor *mq2Sensor = nullptr;
static LightSensor *lightSensor = nullptr;
static IRSensor *irSensor = nullptr;
static PIRSensor *pirSensor = nullptr;
static BMP180Sensor *bmp180Sensor = nullptr;

// list used by the read/publish helpers
static std::vector<ISensor *> sensors;

void initSensors(uint8_t pinDht,
                 uint8_t pinMq2,
                 uint8_t pinLight,
                 uint8_t pinIr,
                 uint8_t pinPir,
                 uint8_t i2cSda,
                 uint8_t i2cScl) {
    // create each sensor with the requested pins; NULL means "disabled".
    dhtSensor = (pinDht != NO_PIN) ? new DHTSensor(pinDht) : nullptr;
    mq2Sensor = (pinMq2 != NO_PIN) ? new MQ2Sensor(pinMq2) : nullptr;
    lightSensor = (pinLight != NO_PIN) ? new LightSensor(pinLight) : nullptr;
    irSensor = (pinIr != NO_PIN) ? new IRSensor(pinIr) : nullptr;
    pirSensor = (pinPir != NO_PIN) ? new PIRSensor(pinPir) : nullptr;

    // BMP180 only if the caller provided valid I2C pins.
    if (i2cSda != NO_PIN && i2cScl != NO_PIN) {
        bmp180Sensor = new BMP180Sensor();
    } else {
        bmp180Sensor = nullptr;
    }

    // populate the vector in the same order the old static array used
    sensors.clear();
    if (dhtSensor)
        sensors.push_back(dhtSensor);
    if (mq2Sensor)
        sensors.push_back(mq2Sensor);
    if (lightSensor)
        sensors.push_back(lightSensor);
    if (irSensor)
        sensors.push_back(irSensor);
    if (bmp180Sensor)
        sensors.push_back(bmp180Sensor);
    if (pirSensor)
        sensors.push_back(pirSensor);

    // Init I2C (only relevant for the BMP180)
    if (i2cSda != NO_PIN && i2cScl != NO_PIN) {
        Wire.begin(i2cSda, i2cScl);
    }

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
    Serial.println("[SENSOR] readAllSensors() called");
    Serial.print("[SENSOR] Number of sensors: ");
    Serial.println(sensors.size());
    Serial.flush();

    oled.clear();

    std::vector<String> unitsList; // all name:value[unit] as separate units
    std::vector<uint8_t> deviceIds = SensorStateManager::getDeviceIdListInOrder();
    Serial.print("[SENSOR] Number of device IDs: ");
    Serial.println(deviceIds.size());
    Serial.flush();

    size_t deviceIdIdx = 0; // Track position in device ID list

    for (size_t sensorIdx = 0; sensorIdx < sensors.size(); sensorIdx++) {
        ISensor *s = sensors[sensorIdx];
        std::vector<float> values = s->read();
        std::vector<String> names = s->getMeasurementNames();
        std::vector<String> units = s->getUnits();

        if (values.empty()) {
            Serial.println("[SENSOR] Sensor returned no values");
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

    // ----------- DISPLAY SENSOR DATA --------------
    Serial.print("[SENSOR] Display has ");
    Serial.print(unitsList.size());
    Serial.println(" units to display");

#ifdef USE_U8G2
    // Original U8G2 layout with specific positioning
    char tempStr[16] = "T:--";
    char humStr[16] = "H:--";
    char lpgStr[16] = "LPG:--";
    char ch4Str[16] = "CH4:--";
    char smokeStr[16] = "SMOKE:--";
    char flameStr[16] = "FLAME:--";
    char lightStr[16] = "LIGHT:--";

    // Parse unitsList to extract values for specific sensors
    for (String unit : unitsList) {
        if (unit.startsWith("T:")) {
            snprintf(tempStr, sizeof(tempStr), "%s", unit.c_str());
        } else if (unit.startsWith("H:")) {
            snprintf(humStr, sizeof(humStr), "%s", unit.c_str());
        } else if (unit.startsWith("LPG:")) {
            snprintf(lpgStr, sizeof(lpgStr), "%s", unit.c_str());
        } else if (unit.startsWith("CH4:")) {
            snprintf(ch4Str, sizeof(ch4Str), "%s", unit.c_str());
        } else if (unit.startsWith("Smoke:")) {
            snprintf(smokeStr, sizeof(smokeStr), "%s", unit.c_str());
        } else if (unit.startsWith("Flame:")) {
            bool flameDetected = unit.substring(6).toFloat() > 0.5;
            snprintf(flameStr, sizeof(flameStr), "Flame:%s", flameDetected ? "YES" : "NO");
        } else if (unit.startsWith("L:")) {
            bool lightDetected = unit.substring(2).toFloat() > 0.5;
            snprintf(lightStr, sizeof(lightStr), "Light:%s", lightDetected ? "YES" : "NO");
        }
    }

    // Get U8G2 instance and draw with original spacing
    U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *u8g2 = oled.getU8g2();
    if (u8g2) {
        u8g2->clearBuffer();
        u8g2->setFont(u8g2_font_guildenstern_nbp_t_all);

        int leftColX = 5, rightColX = 60;
        int rowY = 12, rowSpacing = 14;

        u8g2->drawStr(leftColX, rowY, tempStr);
        yield();
        rowY += rowSpacing;
        u8g2->drawStr(leftColX, rowY, humStr);
        yield();
        rowY += rowSpacing;
        u8g2->drawStr(leftColX, rowY, lpgStr);
        yield();

        char timeStr[24];
        bool isConnected = (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0));
        snprintf(timeStr, sizeof(timeStr), "%s",
                 isConnected ? "+ " : "- ");
        rowY += rowSpacing;
        u8g2->drawStr(leftColX, rowY, timeStr);
        yield();

        rowY = 12;
        u8g2->drawStr(rightColX, rowY, ch4Str);
        yield();
        rowY += rowSpacing;
        u8g2->drawStr(rightColX, rowY, smokeStr);
        yield();
        rowY += rowSpacing;
        u8g2->drawStr(rightColX, rowY, flameStr);
        yield();
        rowY += rowSpacing;
        u8g2->drawStr(rightColX, rowY, lightStr);
        yield();

        u8g2->sendBuffer();
    }
#else
    // Generic display for SSD1306
    int line = 0;
    const int maxUnitsPerLine = 2;

    for (size_t i = 0; i < unitsList.size(); i += maxUnitsPerLine) {
        String lineText = unitsList[i];
        if (i + 1 < unitsList.size()) {
            lineText += " " + unitsList[i + 1];
        }
        Serial.print("[SENSOR] Line ");
        Serial.print(line);
        Serial.print(": ");
        Serial.println(lineText);
        oled.printLine(line, lineText);
        line++;
    }

    oled.show();
#endif

    Serial.println("[SENSOR] Display show() completed");
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
