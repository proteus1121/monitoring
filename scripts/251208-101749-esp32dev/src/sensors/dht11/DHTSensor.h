#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include "../ISensor.h"
#include <DHTesp.h>

class DHTSensor : public ISensor {
public:
    DHTSensor(uint8_t pin, DHTesp::DHT_MODEL_t model);

    void init() override;
    void update() override;
    bool read(const String &type, float &value) override;

private:
    uint8_t pin;
    DHTesp::DHT_MODEL_t model;
    DHTesp dht;
    unsigned long lastRead = 0;
    bool valid = false;
    float temperature = NAN;
    float humidity = NAN;
};

#endif
