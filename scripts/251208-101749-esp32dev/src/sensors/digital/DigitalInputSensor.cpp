#include "DigitalInputSensor.h"

DigitalInputSensor::DigitalInputSensor(uint8_t pin, bool activeLow) : pin(pin), activeLow(activeLow) {}

void DigitalInputSensor::init() {
    pinMode(pin, INPUT);
}

bool DigitalInputSensor::read(const String &type, float &value) {
    bool high = digitalRead(pin) == HIGH;
    value = (high != activeLow) ? 1.0f : 0.0f;
    return true;
}
