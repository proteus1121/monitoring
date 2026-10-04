#include "AnalogInputSensor.h"

static const unsigned long ANALOG_READ_INTERVAL_MS = 1000;

AnalogInputSensor::AnalogInputSensor(uint8_t pin) : pin(pin) {}

void AnalogInputSensor::init() {
    pinMode(pin, INPUT);
}

void AnalogInputSensor::update() {
    unsigned long now = millis();
    if (valid && now - lastRead < ANALOG_READ_INTERVAL_MS)
        return;
    lastRead = now;
    last = analogRead(pin);
    valid = true;
}

bool AnalogInputSensor::read(const String &type, float &value) {
    if (!valid)
        return false;
    value = last;
    return true;
}
