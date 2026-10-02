#ifndef RELAY_OUTPUT_H
#define RELAY_OUTPUT_H

#include "../ISensor.h"

/**
 * Digital output driven by commands from the server; HIGH = on. Reports its current state.
 */
class RelayOutput : public ISensor {
public:
    RelayOutput(uint8_t pin);

    void init() override;
    bool read(const String &type, float &value) override;
    bool write(float value) override;
    bool isEventDriven() override { return true; }

private:
    uint8_t pin;
    bool on = false;
};

#endif
