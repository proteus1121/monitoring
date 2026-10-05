// src/sensors.h – драйвери модулів стенда
#pragma once
#include <Adafruit_BMP085.h>
#include "ISensor.h"
#include "config.h"

// середнє з 16 вимірювань; analogReadMilliVolts() враховує заводське калібрування АЦП,
// але не замінює мультиметр: похибка залежить від конкретної плати
inline float averageMv(uint8_t pin) {
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) sum += analogReadMilliVolts(pin);
    return sum / 16.0;
}

// DHT дає два покази за одне читання, тому обидва канали беруть їх зі спільного кешу
class DhtReader {
public:
    void init() {
        if (started) return;
        dht.setup(PIN_DHT, DHT_TYPE);
        started = true;
    }
    void update() {
        if (millis() - lastRead < dht.getMinimumSamplingPeriod()) return;
        lastRead = millis();
        TempAndHumidity d = dht.getTempAndHumidity();
        ok = dht.getStatus() == DHTesp::ERROR_NONE;
        if (ok) { t = d.temperature; rh = d.humidity; }
    }
    bool ok = false;
    float t = NAN, rh = NAN;
private:
    DHTesp dht;
    bool started = false;
    unsigned long lastRead = 0;
};

class DhtChannel : public ISensor {
public:
    DhtChannel(DhtReader &dht, bool humidity) : dht(dht), humidity(humidity) {}
    const char *name() override { return humidity ? "humidity" : "temperature"; }
    const char *label() override { return humidity ? "RH" : "T"; }
    const char *unit() override { return humidity ? "%" : "C"; }
    void init() override { dht.init(); }
    void update() override { dht.update(); }
    bool read(float &value) override {
        value = humidity ? dht.rh : dht.t;
        return dht.ok;
    }
private:
    DhtReader &dht;
    bool humidity;
};

class BmpSensor : public ISensor {
public:
    const char *name() override { return "pressure"; }
    const char *label() override { return "p"; }
    const char *unit() override { return "hPa"; }
    void init() override { ok = bmp.begin(); }            // Wire.begin() – у setup()
    bool read(float &value) override {
        if (!ok) return false;
        value = bmp.readPressure() / 100.0;               // Па -> гПа
        return true;
    }
private:
    Adafruit_BMP085 bmp;
    bool ok = false;
};

class Mq2Sensor : public ISensor {
public:
    const char *name() override { return "gas_voltage"; }
    const char *label() override { return "Gas"; }
    const char *unit() override { return "V"; }
    void init() override { analogSetPinAttenuation(PIN_MQ2, ADC_11db); }   // діапазон до ~3,1 В
    bool read(float &value) override {
        value = averageMv(PIN_MQ2) / 1000.0 * 1.5;        // напруга AO, дільник 10/20 кОм
        return true;
    }
};

class SoilSensor : public ISensor {
public:
    const char *name() override { return "soil"; }
    const char *label() override { return "Soil"; }
    const char *unit() override { return "%"; }
    void init() override { analogSetPinAttenuation(PIN_SOIL, ADC_11db); }
    bool read(float &value) override {                    // умовна шкала 0...100 %
        float mv = averageMv(PIN_SOIL);
        value = constrain((SOIL_DRY_MV - mv) * 100.0 / (SOIL_DRY_MV - SOIL_WET_MV), 0.0, 100.0);
        return true;
    }
};

class DigitalEvent : public ISensor {
public:
    // id – коротка назва показника, а не повний топік: publish() сам додає TOPIC_PREFIX
    DigitalEvent(const char *id, uint8_t pin, bool activeLow) : id(id), pin(pin), activeLow(activeLow) {}
    const char *name() override { return id; }
    void init() override { pinMode(pin, INPUT); }
    bool read(float &value) override {
        value = (digitalRead(pin) == HIGH) != activeLow;  // 1 – подія
        return true;
    }
    bool isEventDriven() override { return true; }
private:
    const char *id;
    uint8_t pin;
    bool activeLow;
};
