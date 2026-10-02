#include "DHTSensor.h"

DHTSensor::DHTSensor(uint8_t pin, DHTesp::DHT_MODEL_t model) : pin(pin), model(model) {}

void DHTSensor::init() {
    dht.setup(pin, model);
}

void DHTSensor::update() {
    unsigned long now = millis();
    if (lastRead != 0 && now - lastRead < (unsigned long)dht.getMinimumSamplingPeriod()) {
        return;
    }
    lastRead = now;

    TempAndHumidity data = dht.getTempAndHumidity();
    valid = !isnan(data.temperature) && !isnan(data.humidity);
    if (valid) {
        temperature = data.temperature;
        humidity = data.humidity;
    } else {
        Serial.printf("[DHT] pin %u read failed: %s\n", pin, dht.getStatusString());
    }
}

bool DHTSensor::read(const String &type, float &value) {
    if (!valid)
        return false;
    if (type == "TEMPERATURE") {
        value = temperature;
        return true;
    }
    if (type == "HUMIDITY") {
        value = humidity;
        return true;
    }
    return false;
}
