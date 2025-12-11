#include "IRSensor.h"
#include <Arduino.h>

IRSensor::IRSensor(int pin) : _pin(pin) {}

void IRSensor::init() {
    pinMode(_pin, INPUT);
}

std::vector<float> IRSensor::read() {
    int raw = analogRead(_pin); // ESP32 ADC: 0–4095
    float irPercent = 100.0f - (raw / 4095.0f * 100.0f);

    // Clamp 0–100%
    if (irPercent < 0)
        irPercent = 0;
    if (irPercent > 100)
        irPercent = 100;

    return {irPercent};
}

std::vector<String> IRSensor::getMeasurementNames() {
    return {"IR"};
}

std::vector<String> IRSensor::getUnits() {
    return {"%"};
}