#include "BMP180Sensor.h"
#include <Arduino.h>

Adafruit_BMP085 BMP180Sensor::bmp;

BMP180Sensor::BMP180Sensor() {}

void BMP180Sensor::init() {
    if (!bmp.begin()) {
        Serial.println("BMP180 not found! Check SDA/SCL wiring.");
    } else {
        Serial.println("BMP180 initialized");
    }
}

// Odesa average sea-level pressure
const float SEA_LEVEL_PRESSURE = 101900;  // Pa

std::vector<float> BMP180Sensor::read() {
    if (!bmp.begin()) return {}; // sensor missing

    float temperature = bmp.readTemperature();   // °C
    int32_t pressure = bmp.readPressure();       // Pa

    // Convert pressure to hPa
    float pressure_hPa = pressure / 100.0f;

    float altitude = bmp.readAltitude(SEA_LEVEL_PRESSURE);

    std::vector<float> result;

    result.push_back(temperature);
    result.push_back(pressure_hPa);
    result.push_back(altitude);

    return result;
}

std::vector<String> BMP180Sensor::getMeasurementNames() {
    return {"T", "P", "alt"}; // Pressure, Temperature
}

std::vector<String> BMP180Sensor::getUnits() {
    return {"C", "hPa", "m"};
}