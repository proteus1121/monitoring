#include "SoilMoistureSensor.h"

namespace {

#if defined(ESP8266)
const float ADC_MAX = 1023.0f;
#else
const float ADC_MAX = 4095.0f;
#endif

// until calibrated on the site, as a share of the ADC range at 3.3 V supply: a capacitive v1.2 probe gives
// about 2.2 V in air and 1.0 V in water, a resistive one reads higher in air and is clamped to 0 %
const float DEFAULT_DRY = 0.68f * ADC_MAX;
const float DEFAULT_WET = 0.31f * ADC_MAX;
const int SAMPLES = 8;
const unsigned long READ_INTERVAL_MS = 2000;
const unsigned long LOG_INTERVAL_MS = 10000;

} // namespace

SoilMoistureSensor::SoilMoistureSensor(uint8_t pin, int dry, int wet) : pin(pin) {
    bool calibrated = dry >= 0 && wet >= 0 && dry != wet;
    this->dry = calibrated ? dry : DEFAULT_DRY;
    this->wet = calibrated ? wet : DEFAULT_WET;
}

void SoilMoistureSensor::init() {
    pinMode(pin, INPUT);
}

void SoilMoistureSensor::update() {
    unsigned long now = millis();
    if (valid && now - lastRead < READ_INTERVAL_MS)
        return;
    lastRead = now;

    long sum = 0;
    for (int i = 0; i < SAMPLES; i++) {
        sum += analogRead(pin);
        delay(2);
    }
    float raw = (float)sum / SAMPLES;
    lastRaw = raw;
    percent = constrain((dry - raw) * 100.0f / (dry - wet), 0.0f, 100.0f);
    valid = true;
    // the raw value is what a calibration needs
    if (lastLog == 0 || now - lastLog >= LOG_INTERVAL_MS) {
        lastLog = now;
        Serial.printf("[SOIL] raw %.0f -> %.0f %%\n", raw, percent);
    }
}

bool SoilMoistureSensor::raw(float &value) {
    if (!valid)
        return false;
    value = lastRaw;
    return true;
}

bool SoilMoistureSensor::read(const String &type, float &value) {
    if (!valid)
        return false;
    value = percent;
    return true;
}
