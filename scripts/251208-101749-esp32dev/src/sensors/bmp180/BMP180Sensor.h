#ifndef BMP180_SENSOR_H
#define BMP180_SENSOR_H

#include "../ISensor.h"
#include <Adafruit_BMP085.h>
#include <vector>

class BMP180Sensor : public ISensor {
public:
    BMP180Sensor();   // I2C – no pin needed

    void init() override;
    std::vector<float> read() override;
    std::vector<String> getMeasurementNames() override;
    std::vector<String> getUnits() override;

private:
    static Adafruit_BMP085 bmp;
};

#endif
