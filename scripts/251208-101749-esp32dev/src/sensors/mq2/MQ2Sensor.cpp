#include "MQ2Sensor.h"
#include <Arduino.h>

MQ2Sensor::MQ2Sensor(int pin) : pin(pin), mq2(pin) {}

void MQ2Sensor::init() {
    mq2.calibrate();
}

std::vector<float> MQ2Sensor::read() {
    std::vector<float> result;
    result.push_back(mq2.readLPG());
    result.push_back(mq2.readMethane());
    result.push_back(mq2.readSmoke());

    return result;
}

std::vector<String> MQ2Sensor::getMeasurementNames() {
    return {"LPG", "CH4", "Smoke"};
}

std::vector<String> MQ2Sensor::getUnits() {
    return {"", "", ""};
}