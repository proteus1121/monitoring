#include "LightSensor.h"
#include <Arduino.h>

LightSensor::LightSensor(int pin) : pin(pin) {}

void LightSensor::init() {
    pinMode(pin, INPUT);
}

std::vector<float> LightSensor::read() {
    bool lightDetected = digitalRead(pin) == LOW;
    float lightValue = lightDetected ? 1.0 : 0.0;

    Serial.print("[DEBUG] LightSensor detected=");
    Serial.println(lightDetected);

    return {lightValue};
}

std::vector<String> LightSensor::getMeasurementNames() {
    return {"L"};
}

std::vector<String> LightSensor::getUnits() {
    return {""};
}