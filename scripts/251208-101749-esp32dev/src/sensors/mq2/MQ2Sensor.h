#ifndef MQ2_SENSOR_H
#define MQ2_SENSOR_H

#include "../ISensor.h"
#include <TroykaMQ.h>

class MQ2Sensor : public ISensor {
public:
    MQ2Sensor(uint8_t pin);

    void init() override;
    void update() override;
    bool read(const String &type, float &value) override;

private:
    MQ2 mq2;
    unsigned long lastRead = 0;
    bool valid = false;
    float lpg = 0;
    float methane = 0;
    float smoke = 0;
};

#endif
