#ifndef MQ2_SENSOR_H
#define MQ2_SENSOR_H

#include "../ISensor.h"
#include <TroykaMQ.h>

class MQ2Sensor : public ISensor {
public:
    MQ2Sensor(int pin);

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    int pin;
    MQ2 mq2;
};

#endif
