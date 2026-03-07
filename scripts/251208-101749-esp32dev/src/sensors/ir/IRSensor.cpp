#include "IRSensor.h"
#include <Arduino.h>

IRSensor::IRSensor(int pin) : _pin(pin) {}

void IRSensor::init() {
    pinMode(_pin, INPUT);
}

std::vector<float> IRSensor::read() {
    bool flameDetected = digitalRead(_pin) == LOW;
    float flameValue = flameDetected ? 1.0 : 0.0;

    Serial.print("[DEBUG] IRSensor detected=");
    Serial.println(flameDetected);

    return {flameValue};
}

std::vector<String> IRSensor::getMeasurementNames() {
    return {"Flame"};
}

std::vector<String> IRSensor::getUnits() {
    return {""};
}