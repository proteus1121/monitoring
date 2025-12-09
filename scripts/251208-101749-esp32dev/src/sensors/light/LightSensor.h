#ifndef LIGHT_SENSOR_H
#define LIGHT_SENSOR_H

#include "../ISensor.h"

class LightSensor : public ISensor {
public:
    LightSensor(int pin);

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    int pin;
};

#endif
