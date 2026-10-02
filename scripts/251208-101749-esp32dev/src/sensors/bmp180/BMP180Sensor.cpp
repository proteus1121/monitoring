#include "BMP180Sensor.h"
#include <Wire.h>

static const unsigned long BMP180_READ_INTERVAL = 1000;
static const unsigned long BMP180_RETRY_INTERVAL = 30000;

BMP180Sensor::BMP180Sensor(uint8_t sda, uint8_t scl) : sda(sda), scl(scl) {}

void BMP180Sensor::init() {
    Wire.begin(sda, scl);
    present = bmp.begin();
    Serial.printf("[BMP180] SDA=%u SCL=%u %s\n", sda, scl, present ? "initialized" : "not found, check wiring");
}

void BMP180Sensor::update() {
    unsigned long now = millis();
    if (!present) {
        // the module may be plugged in later
        if (now - lastRead >= BMP180_RETRY_INTERVAL) {
            lastRead = now;
            present = bmp.begin();
        }
        return;
    }
    if (lastRead != 0 && now - lastRead < BMP180_READ_INTERVAL) {
        return;
    }
    lastRead = now;

    temperature = bmp.readTemperature();
    pressureHpa = bmp.readPressure() / 100.0f;
    valid = true;
}

bool BMP180Sensor::read(const String &type, float &value) {
    if (!present || !valid)
        return false;
    if (type == "TEMPERATURE") {
        value = temperature;
        return true;
    }
    if (type == "PRESSURE") {
        value = pressureHpa;
        return true;
    }
    return false;
}
