#ifndef SOIL_MOISTURE_SENSOR_H
#define SOIL_MOISTURE_SENSOR_H

#include "../ISensor.h"

/**
 * Soil moisture probe on an ADC pin (capacitive v1.2 or resistive YL-69 / FC-28), in % of water:
 * 0 % dry, 100 % in water. Both give a lower voltage the wetter the soil.
 */
class SoilMoistureSensor : public ISensor {
public:
    // dry / wet: raw values for 0 % and 100 % calibrated on the site, -1 for the defaults
    SoilMoistureSensor(uint8_t pin, int dry, int wet);

    void init() override;
    // samples the ADC every few seconds: the device loop reads every pass, and frequent analogRead
    // disturbs the ESP8266 Wi-Fi
    void update() override;
    bool read(const String &type, float &value) override;
    bool raw(float &value) override;

private:
    uint8_t pin;
    float dry;
    float wet;
    float lastRaw = 0;
    float percent = 0;
    bool valid = false;
    unsigned long lastRead = 0;
    unsigned long lastLog = 0;
};

#endif
