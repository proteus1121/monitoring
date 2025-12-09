#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include "../ISensor.h"
#include <DHTesp.h>

class DHTSensor : public ISensor {
public:
    DHTSensor(int pin);

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    int pin;
    DHTesp dht;
};

#endif
