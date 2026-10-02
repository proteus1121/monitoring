#include "RelayOutput.h"

RelayOutput::RelayOutput(uint8_t pin) : pin(pin) {}

void RelayOutput::init() {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, on ? HIGH : LOW);
}

bool RelayOutput::read(const String &type, float &value) {
    value = on ? 1.0f : 0.0f;
    return true;
}

bool RelayOutput::write(float value) {
    on = value >= 0.5f;
    digitalWrite(pin, on ? HIGH : LOW);
    Serial.printf("[RELAY] pin %u -> %s\n", pin, on ? "ON" : "OFF");
    return true;
}
