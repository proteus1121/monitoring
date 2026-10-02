#ifndef DIGITAL_INPUT_SENSOR_H
#define DIGITAL_INPUT_SENSOR_H

#include "../ISensor.h"

/**
 * Any module with a digital output: IR flame sensor and light sensor DO are active LOW,
 * PIR and generic inputs are active HIGH. Reports 1 when active.
 */
class DigitalInputSensor : public ISensor {
public:
    DigitalInputSensor(uint8_t pin, bool activeLow);

    void init() override;
    bool read(const String &type, float &value) override;
    bool isEventDriven() override { return true; }

private:
    uint8_t pin;
    bool activeLow;
};

#endif
