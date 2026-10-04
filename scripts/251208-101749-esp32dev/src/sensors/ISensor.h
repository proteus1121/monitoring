#ifndef ISENSOR_H
#define ISENSOR_H

#include <Arduino.h>

/**
 * Hardware module driver. One driver instance serves every device configured on the same
 * module and pins (e.g. DHT11 temperature and humidity share one driver).
 */
class ISensor {
public:
    virtual ~ISensor() {}

    virtual void init() = 0;

    // Refresh cached readings; called every loop, drivers rate-limit themselves.
    virtual void update() {}

    // Value for a measurement type (DeviceType name from the server), false when unavailable.
    virtual bool read(const String &type, float &value) = 0;

    // Apply a command; only output modules (relay) support it.
    virtual bool write(float value) { return false; }

    // Inputs that should be published as soon as they change (flame, motion, ...).
    virtual bool isEventDriven() { return false; }

    // Raw ADC value behind the reading, published next to it for calibrating the sensor on the site.
    virtual bool raw(float &value) { return false; }
};

#endif
