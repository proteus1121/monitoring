#include "MonitoringSensors.h"
#include "ISensor.h"
#include "dht11/DHTSensor.h"
#include "mq2/MQ2Sensor.h"
#include "light/LightSensor.h"
#include "ir/IRSensor.h"
#include "bmp180/BMP180Sensor.h"
#include "pir/PIRSensor.h"
#include "../display/DisplayManager.h"
#include <Wire.h>

// Pins
#define PIN_DHT    26
#define PIN_MQ2    35
#define PIN_LIGHT  32
#define PIN_IR     33
#define PIN_PIR    12

// Create sensor objects
DHTSensor dhtSensor(PIN_DHT);
MQ2Sensor mq2Sensor(PIN_MQ2);
LightSensor lightSensor(PIN_LIGHT);
IRSensor irSensor(PIN_IR);
PIRSensor pirSensor(PIN_PIR);
BMP180Sensor bmp180Sensor;

// Create array of pointers to sensors
ISensor* sensors[] = {
    &dhtSensor,
    &mq2Sensor,
    &lightSensor,
    &irSensor,
    &bmp180Sensor,
    &pirSensor
};

void initSensors() {
    // Init I2C with your custom pins
    Wire.begin(14, 27);
    for (ISensor* s : sensors) {
        s->init();
    }
    oled.begin();
}

void readAllSensors() {
    oled.clear();

    std::vector<String> unitsList; // all name:value[unit] as separate units

    for (ISensor* s : sensors) {
        std::vector<float> values = s->read();
        std::vector<String> names = s->getMeasurementNames();
        std::vector<String> units = s->getUnits();

        if (values.empty()) {
            Serial.println("Sensor returned no values");
            unitsList.push_back("No data");
            continue;
        }

        String serialText = "";

        for (size_t i = 0; i < values.size(); i++) {
            String unitStr = "";
            if (!names.empty() && i < names.size()) unitStr += names[i];
            unitStr += ":" + String(values[i], 1);
            if (!units.empty() && i < units.size()) unitStr += units[i];

            unitsList.push_back(unitStr);

            // Serial log
            if (!names.empty() && i < names.size()) serialText += names[i];
            serialText += ": " + String(values[i], 1);
            if (!units.empty() && i < units.size()) serialText += units[i];
            if (i < values.size() - 1) serialText += " | ";
        }

        Serial.println(serialText);
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



