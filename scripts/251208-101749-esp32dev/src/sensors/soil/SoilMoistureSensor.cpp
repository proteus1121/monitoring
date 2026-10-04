#include "SoilMoistureSensor.h"

namespace {

#if defined(ESP8266)
const float ADC_MAX = 1023.0f;
#else
const float ADC_MAX = 4095.0f;
#endif

// share of the ADC range at 3.3 V supply: a capacitive v1.2 probe gives about 2.2 V in air and 1.0 V in water,
// a resistive one reads higher in air and is clamped to 0 %
const float DRY = 0.68f * ADC_MAX;
const float WET = 0.31f * ADC_MAX;
const int SAMPLES = 8;

} // namespace

SoilMoistureSensor::SoilMoistureSensor(uint8_t pin) : pin(pin) {}

void SoilMoistureSensor::init() {
    pinMode(pin, INPUT);
}

bool SoilMoistureSensor::read(const String &type, float &value) {
    long sum = 0;
    for (int i = 0; i < SAMPLES; i++) {
        sum += analogRead(pin);
        delay(2);
    }
    float raw = (float)sum / SAMPLES;
    float percent = (DRY - raw) * 100.0f / (DRY - WET);
    value = constrain(percent, 0.0f, 100.0f);
    Serial.printf("[SOIL] raw %.0f -> %.0f %%\n", raw, value);
    return true;
}
