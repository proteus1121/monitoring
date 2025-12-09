#include "DHTSensor.h"
#include <Arduino.h>

DHTSensor::DHTSensor(int pin) : pin(pin) {}

void DHTSensor::init() {
    dht.setup(pin, DHTesp::DHT11);
}

std::vector<float> DHTSensor::read() {
    TempAndHumidity data = dht.getTempAndHumidity();
    std::vector<float> result;
    if (isnan(data.temperature) || isnan(data.humidity)) {
        result.push_back(-1); // error code
        result.push_back(-1);
    } else {
        result.push_back(data.temperature);
        result.push_back(data.humidity);
    }

    return result;
}

std::vector<String> DHTSensor::getMeasurementNames() {
    return {"T", "H"}; // temperature, humidity
}

std::vector<String> DHTSensor::getUnits() {
    return {"C", "%"};
}
