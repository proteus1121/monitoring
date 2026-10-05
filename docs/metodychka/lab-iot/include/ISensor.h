#pragma once
#include <Arduino.h>

class ISensor {
public:
    virtual ~ISensor() {}
    virtual const char *name() = 0;            // частина топіка: temperature, soil ...
    virtual void init() = 0;
    virtual void update() {}                   // викликається в кожному loop()
    virtual bool read(float &value) = 0;       // false, якщо показу немає
    virtual bool isEventDriven() { return false; }   // публікувати одразу після зміни
};
