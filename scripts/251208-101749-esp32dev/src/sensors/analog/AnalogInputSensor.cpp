#include "AnalogInputSensor.h"

AnalogInputSensor::AnalogInputSensor(uint8_t pin) : pin(pin) {}

void AnalogInputSensor::init() {
    pinMode(pin, INPUT);
}

bool AnalogInputSensor::read(const String &type, float &value) {
    value = analogRead(pin);
    return true;
}
