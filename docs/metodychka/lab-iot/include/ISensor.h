#pragma once
#include <Arduino.h>

class ISensor {
public:
    virtual ~ISensor() {}
    virtual const char *name() = 0;            // частина топіка: temperature, soil ...
    virtual const char *label() { return name(); }   // коротка назва для дисплея
    virtual const char *unit() { return ""; }
    virtual void init() = 0;
    virtual void update() {}                   // періодичне оновлення, якщо драйверу воно потрібне
    virtual bool read(float &value) = 0;       // останнє значення або вимірювання; false, якщо показу немає
    virtual bool isEventDriven() { return false; }   // публікувати одразу після зміни
};
