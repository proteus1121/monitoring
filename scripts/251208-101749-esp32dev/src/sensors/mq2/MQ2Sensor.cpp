#include "MQ2Sensor.h"

// each read samples the ADC several times with delays, so do not poll too often
static const unsigned long MQ2_READ_INTERVAL = 2000;

MQ2Sensor::MQ2Sensor(uint8_t pin) : mq2(pin) {}

void MQ2Sensor::init() {
    mq2.calibrate();
    Serial.print("[MQ2] Ro = ");
    Serial.println(mq2.getRo());
}

void MQ2Sensor::update() {
    unsigned long now = millis();
    if (lastRead != 0 && now - lastRead < MQ2_READ_INTERVAL) {
        return;
    }
    lastRead = now;

    // library returns 0 or garbage for invalid readings
    float v = mq2.readLPG();
    lpg = v > 0 ? v : 0;
    v = mq2.readMethane();
    methane = v > 0 ? v : 0;
    v = mq2.readSmoke();
    smoke = v > 0 ? v : 0;
    valid = true;
}

bool MQ2Sensor::read(const String &type, float &value) {
    if (!valid)
        return false;
    if (type == "LPG") {
        value = lpg;
        return true;
    }
    if (type == "CH4") {
        value = methane;
        return true;
    }
    if (type == "SMOKE") {
        value = smoke;
        return true;
    }
    return false;
}
