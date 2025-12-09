#ifndef PIR_SENSOR_H
#define PIR_SENSOR_H

#include <Arduino.h>
#include "../ISensor.h"

class PIRSensor : public ISensor {
public:
    PIRSensor(int pin);

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    int _pin;
};

#endif
