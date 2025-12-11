#include "PIRSensor.h"
#include <Arduino.h>

PIRSensor::PIRSensor(int pin) : _pin(pin) {}

void PIRSensor::init() {
    pinMode(_pin, INPUT);
}

std::vector<float> PIRSensor::read() {
    std::vector<float> result;
    result.push_back(digitalRead(_pin) ? 1.0 : 0.0);
    return result;
}

std::vector<String> PIRSensor::getMeasurementNames() {
    return {"Motion"};
}

std::vector<String> PIRSensor::getUnits() {
    return {""};
}