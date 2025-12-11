#ifndef IR_SENSOR_H
#define IR_SENSOR_H

#include "../ISensor.h"
#include <Arduino.h>

class IRSensor : public ISensor {
public:
    IRSensor(int pin);

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    int _pin;
};

#endif
