#include "Scanner.h"
#include "../devices/DeviceManager.h"
#include "../display/DisplayManager.h"
#include "../network/mqtt/MQTTHandler.h"
#include <Adafruit_BMP085.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <vector>

namespace {

struct PinInfo {
    uint8_t gpio;
    bool i2c;       // can be an I2C line (open drain)
    bool inputOnly; // ESP32 GPIO34-39
    bool analog;
    // resistor on the dev board itself: such a pin always looks pulled, only the opposite level is a module
    int8_t boardPull; // 1 = up, -1 = down, 0 = none
};

#if defined(ESP8266)
// NodeMCU: D0 has no open drain; D4 has a pull-up and D8 a pull-down on the board. D3 is the FLASH button,
// RX / TX are the USB serial port.
const PinInfo PINS[] = {
    {16, false, false, false, 0}, {5, true, false, false, 0}, {4, true, false, false, 0},
    {2, true, false, false, 1},   {14, true, false, false, 0}, {12, true, false, false, 0},
    {13, true, false, false, 0},  {15, true, false, false, -1}, {A0, false, true, true, 0},
};
#else
// ESP32 DevKit: GPIO0 is the BOOT button, 1 / 3 the USB serial port, 6-11 the flash; GPIO2 drives the
// on-board LED, which pulls it down
const PinInfo PINS[] = {
    {2, true, false, false, -1},  {4, true, false, false, 0},  {5, true, false, false, 0},  {12, true, false, false, 0},
    {13, true, false, false, 0},  {14, true, false, false, 0}, {15, true, false, false, 0}, {16, true, false, false, 0},
    {17, true, false, false, 0},  {18, true, false, false, 0}, {19, true, false, false, 0}, {21, true, false, false, 0},
    {22, true, false, false, 0},  {23, true, false, false, 0}, {25, true, false, false, 0}, {26, true, false, false, 0},
    {27, true, false, false, 0},  {32, true, false, true, 0},  {33, true, false, true, 0},  {34, false, true, true, 0},
    {35, false, true, true, 0},   {36, false, true, true, 0},  {39, false, true, true, 0},
};
#endif

struct Probe {
    const PinInfo *pin;
    bool pulledHigh; // returns HIGH after being charged LOW
    bool pulledLow;  // returns LOW after being charged HIGH
    bool used;       // claimed by a finding
};

String pendingId;
bool pending = false;

bool isFree(uint8_t gpio) {
    return !DeviceManager::usesPin(gpio) && !oled.usesPin(gpio);
}

// Charge the pin's capacitance to `level` for a few microseconds and see whether it keeps it
int returnsTo(uint8_t gpio, int level) {
    pinMode(gpio, OUTPUT);
    digitalWrite(gpio, level);
    delayMicroseconds(10);
    pinMode(gpio, INPUT);
    delayMicroseconds(50);
    return digitalRead(gpio);
}

void beginI2c(uint8_t sda, uint8_t scl) {
#if defined(ESP32)
    Wire.end();
#endif
    Wire.begin(sda, scl);
}

bool i2cAnswers(uint8_t address) {
    Wire.beginTransmission(address);
    return Wire.endTransmission() == 0;
}

int readRegister(uint8_t address, uint8_t reg) {
    Wire.beginTransmission(address);
    Wire.write(reg);
    if (Wire.endTransmission() != 0)
        return -1;
    if (Wire.requestFrom(address, (uint8_t)1) != 1)
        return -1;
    return Wire.read();
}

// Every answering address on the bus, `skip` excluded (the display's own address on its bus)
void scanI2cBus(uint8_t sda, uint8_t scl, int skip, JsonArray found, bool &any) {
    beginI2c(sda, scl);
    for (uint8_t address = 0x08; address < 0x78; address++) {
        if (address == skip || !i2cAnswers(address))
            continue;
        any = true;
        if (address == 0x76 || address == 0x77) {
            int id = readRegister(address, 0xD0);
            if (id == 0x55) {
                Adafruit_BMP085 bmp;
                JsonObject f = found.add<JsonObject>();
                f["k"] = "bmp180";
                f["p"].add(sda);
                f["p"].add(scl);
                if (bmp.begin()) {
                    f["t"] = serialized(String(bmp.readTemperature(), 1));
                    f["pr"] = serialized(String(bmp.readPressure() / 100.0f, 1));
                }
                continue;
            }
            JsonObject f = found.add<JsonObject>();
            f["k"] = "i2c";
            f["p"].add(sda);
            f["p"].add(scl);
            f["a"] = address;
            if (id == 0x58)
                f["n"] = "bmp280";
            else if (id == 0x60)
                f["n"] = "bme280";
            continue;
        }
        JsonObject f = found.add<JsonObject>();
        f["k"] = "i2c";
        f["p"].add(sda);
        f["p"].add(scl);
        f["a"] = address;
        if (address == 0x3C || address == 0x3D)
            f["n"] = "oled";
        else if (address == 0x23 || address == 0x5C)
            f["n"] = "bh1750";
    }
}

long waitFor(uint8_t gpio, int level, unsigned long timeoutUs) {
    unsigned long start = micros();
    while (digitalRead(gpio) != level) {
        if (micros() - start > timeoutUs)
            return -1;
    }
    return micros() - start;
}

/**
 * One DHT read: 20 ms start pulse (both models answer it), 40 bits. DHT11 sends whole numbers with the
 * humidity decimal byte at 0, DHT22 16-bit values; the bytes tell which one answered.
 */
bool readDht(uint8_t gpio, JsonArray found) {
    uint8_t data[5] = {0, 0, 0, 0, 0};
    pinMode(gpio, OUTPUT);
    digitalWrite(gpio, LOW);
    delay(20);
    pinMode(gpio, INPUT_PULLUP);

    bool ok = true;
    noInterrupts();
    // answer: LOW 80 us, HIGH 80 us
    if (waitFor(gpio, LOW, 200) < 0 || waitFor(gpio, HIGH, 200) < 0 || waitFor(gpio, LOW, 200) < 0) {
        ok = false;
    }
    for (int bit = 0; ok && bit < 40; bit++) {
        // each bit: LOW 50 us, then HIGH 26-28 us for 0 or 70 us for 1
        if (waitFor(gpio, HIGH, 200) < 0) {
            ok = false;
            break;
        }
        long high = waitFor(gpio, LOW, 200);
        if (high < 0) {
            ok = false;
            break;
        }
        data[bit / 8] <<= 1;
        if (high > 45)
            data[bit / 8] |= 1;
    }
    interrupts();
    pinMode(gpio, INPUT);

    if (!ok || (uint8_t)(data[0] + data[1] + data[2] + data[3]) != data[4] || (data[0] | data[2]) == 0)
        return false;

    float humidity, temperature;
    const char *model;
    if (data[1] == 0 && data[0] >= 5 && data[0] <= 100 && data[3] < 10) {
        model = "DHT11";
        humidity = data[0];
        temperature = (data[2] & 0x7F) + data[3] * 0.1f;
        if (data[2] & 0x80)
            temperature = -temperature;
    } else {
        model = "DHT22";
        humidity = ((data[0] << 8) | data[1]) * 0.1f;
        temperature = (((data[2] & 0x7F) << 8) | data[3]) * 0.1f;
        if (data[2] & 0x80)
            temperature = -temperature;
        if (humidity > 100 || temperature < -40 || temperature > 80)
            return false;
    }
    JsonObject f = found.add<JsonObject>();
    f["k"] = "dht";
    f["m"] = model;
    f["p"].add(gpio);
    f["t"] = serialized(String(temperature, 1));
    f["h"] = serialized(String(humidity, 1));
    return true;
}

int averageAnalog(uint8_t gpio, int &spread) {
    int minimum = 100000, maximum = -1;
    long sum = 0;
    for (int i = 0; i < 8; i++) {
        int v = analogRead(gpio);
        sum += v;
        minimum = min(minimum, v);
        maximum = max(maximum, v);
        delay(2);
    }
    spread = maximum - minimum;
    return sum / 8;
}

void run(const String &id) {
    Serial.println("[SCAN] Looking for modules on the free pins");
    unsigned long started = millis();
    JsonDocument doc;
    doc["id"] = id;
    JsonArray scanned = doc["pins"].to<JsonArray>();
    JsonArray found = doc["found"].to<JsonArray>();

    std::vector<Probe> probes;
    for (const PinInfo &pin : PINS) {
        if (!isFree(pin.gpio))
            continue;
        scanned.add(pin.gpio);
        Probe probe{&pin, false, false, false};
        if (!pin.inputOnly) {
            probe.pulledHigh = returnsTo(pin.gpio, LOW) == HIGH;
            probe.pulledLow = returnsTo(pin.gpio, HIGH) == LOW;
            pinMode(pin.gpio, INPUT);
        }
        probes.push_back(probe);
        yield();
    }

    // I2C: both lines have pull-ups on the module
    for (Probe &sda : probes) {
        for (Probe &scl : probes) {
            if (&sda == &scl || sda.used || scl.used || !sda.pin->i2c || !scl.pin->i2c || !sda.pulledHigh ||
                !scl.pulledHigh)
                continue;
            bool any = false;
            scanI2cBus(sda.pin->gpio, scl.pin->gpio, -1, found, any);
            if (any) {
                sda.used = scl.used = true;
            }
            yield();
        }
    }
    // more modules on the bus of an I2C display (e.g. a BMP180 sharing it)
    const DisplayConfig &display = oled.config();
    if (display.isI2c()) {
        bool any = false;
        int own = -1;
        for (uint8_t address : {0x3C, 0x3D}) {
            beginI2c(display.pins[0], display.pins[1]);
            if (i2cAnswers(address)) {
                own = address;
                break;
            }
        }
        scanI2cBus(display.pins[0], display.pins[1], own, found, any);
    }

    // DHT: anything not driven LOW may be an idle data line (a bare sensor without pull-up floats)
    for (Probe &probe : probes) {
        if (probe.used || probe.pin->inputOnly || (probe.pulledLow && !probe.pulledHigh))
            continue;
        if (readDht(probe.pin->gpio, found))
            probe.used = true;
        yield();
    }

    // what is left: a signal pulls or drives the pin; the board's own resistor only counts the other way
    for (Probe &probe : probes) {
        if (probe.used)
            continue;
        const PinInfo &pin = *probe.pin;
        if (pin.analog) {
            int spread;
            int value = averageAnalog(pin.gpio, spread);
#if defined(ESP8266)
            // NodeMCU A0 has a divider to ground: an open input reads close to 0
            bool signal = value > 30;
            int top = 1023;
#else
            bool signal = value > 100 && spread < 300;
            int top = 4095;
#endif
            if (signal && value < top - 30) {
                JsonObject f = found.add<JsonObject>();
                f["k"] = "analog";
                f["p"].add(pin.gpio);
                f["v"] = value;
                continue;
            }
        }
        bool high = probe.pulledHigh && pin.boardPull != 1;
        bool low = probe.pulledLow && pin.boardPull != -1;
        if (high || low) {
            JsonObject f = found.add<JsonObject>();
            f["k"] = "digital";
            f["p"].add(pin.gpio);
            f["l"] = high && !low ? 1 : 0;
        }
    }

    // give the I2C bus back to the display and the configured modules
    if (display.isI2c())
        beginI2c(display.pins[0], display.pins[1]);
    DeviceManager::reinitI2c();

    String payload;
    serializeJson(doc, payload);
    Serial.printf("[SCAN] Done in %lu ms: %s\n", millis() - started, payload.c_str());
    publishScanResult(payload);
}

} // namespace

namespace Scanner {

void request(const String &id) {
    pendingId = id;
    pending = true;
}

void loop() {
    if (!pending)
        return;
    pending = false;
    run(pendingId);
}

} // namespace Scanner
