#ifndef ANALOG_INPUT_SENSOR_H
#define ANALOG_INPUT_SENSOR_H

#include "../ISensor.h"

/**
 * Raw ADC reading (0..1023 on ESP8266, 0..4095 on ESP32).
 */
class AnalogInputSensor : public ISensor {
public:
    AnalogInputSensor(uint8_t pin);

    void init() override;
    // samples once a second: the device loop reads every pass, and frequent analogRead disturbs the ESP8266 Wi-Fi
    void update() override;
    bool read(const String &type, float &value) override;

private:
    uint8_t pin;
    float last = 0;
    bool valid = false;
    unsigned long lastRead = 0;
};

#endif
