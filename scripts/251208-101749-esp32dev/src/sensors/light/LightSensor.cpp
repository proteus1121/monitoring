#include "LightSensor.h"
#include <Arduino.h>

LightSensor::LightSensor(int pin) : pin(pin) {}

void LightSensor::init() {
    pinMode(pin, INPUT);
}

std::vector<float> LightSensor::read() {
    int raw = analogRead(pin);
    const int RAW_DARK = 3300;
    const int RAW_LIGHT = 300;

    raw = constrain(raw, RAW_LIGHT, RAW_DARK);
    float lightPercent = map(raw, RAW_LIGHT, RAW_DARK, 100, 0);

    return {lightPercent};
}

std::vector<String> LightSensor::getMeasurementNames() {
    return {"L"};
}

std::vector<String> LightSensor::getUnits() {
    return {"%"};
}