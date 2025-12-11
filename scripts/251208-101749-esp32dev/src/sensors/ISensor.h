#ifndef ISENSOR_H
#define ISENSOR_H

#include <Arduino.h>
#include <vector>

class ISensor {
public:
    virtual void init() = 0;
    virtual std::vector<float> read() = 0;
    virtual std::vector<String> getMeasurementNames() = 0;
    virtual std::vector<String> getUnits() = 0;
};

#endif
