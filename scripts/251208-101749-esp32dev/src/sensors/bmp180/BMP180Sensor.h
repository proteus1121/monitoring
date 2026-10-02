#ifndef BMP180_SENSOR_H
#define BMP180_SENSOR_H

#include "../ISensor.h"
#include <Adafruit_BMP085.h>

class BMP180Sensor : public ISensor {
public:
    BMP180Sensor(uint8_t sda, uint8_t scl);

    void init() override;
    void update() override;
    bool read(const String &type, float &value) override;

private:
    uint8_t sda;
    uint8_t scl;
    Adafruit_BMP085 bmp;
    bool present = false;
    unsigned long lastRead = 0;
    bool valid = false;
    float temperature = 0;
    float pressureHpa = 0;
};

#endif
