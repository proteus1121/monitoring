#ifndef SOIL_MOISTURE_SENSOR_H
#define SOIL_MOISTURE_SENSOR_H

#include "../ISensor.h"

/**
 * Soil moisture probe on an ADC pin (capacitive v1.2 or resistive YL-69 / FC-28), in % of water:
 * 0 % dry, 100 % in water. Both give a lower voltage the wetter the soil.
 */
class SoilMoistureSensor : public ISensor {
public:
    SoilMoistureSensor(uint8_t pin);

    void init() override;
    bool read(const String &type, float &value) override;

private:
    uint8_t pin;
};

#endif
