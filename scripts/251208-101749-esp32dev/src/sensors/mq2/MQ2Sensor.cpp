#include "MQ2Sensor.h"
#include <Arduino.h>

MQ2Sensor::MQ2Sensor(int pin) : pin(pin), mq2(pin) {}

void MQ2Sensor::init() {
    mq2.calibrate();
}

std::vector<float> MQ2Sensor::read() {
    std::vector<float> result;
    float lpg = mq2.readLPG();
    float methane = mq2.readMethane();
    float smoke = mq2.readSmoke();

    // Check for valid readings (MQ2 library may return 0 or negative for invalid)
    if (lpg > 0) result.push_back(lpg);
    else result.push_back(0);

    if (methane > 0) result.push_back(methane);
    else result.push_back(0);

    if (smoke > 0) result.push_back(smoke);
    else result.push_back(0);

    return result;
}

std::vector<String> MQ2Sensor::getMeasurementNames() {
    return {"LPG", "CH4", "Smoke"};
}

std::vector<String> MQ2Sensor::getUnits() {
    return {"", "", ""};
}