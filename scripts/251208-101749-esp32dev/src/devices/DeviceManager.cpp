#include "DeviceManager.h"
#include "../display/DisplayManager.h"
#include "../network/mqtt/MQTTHandler.h"
#include "../sensors/ISensor.h"
#include "../sensors/analog/AnalogInputSensor.h"
#include "../sensors/bmp180/BMP180Sensor.h"
#include "../sensors/dht11/DHTSensor.h"
#include "../sensors/digital/DigitalInputSensor.h"
#include "../sensors/mq2/MQ2Sensor.h"
#include "../sensors/relay/RelayOutput.h"
#include <ArduinoJson.h>
#include <map>
#include <vector>

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif

namespace {

const uint32_t DEFAULT_DELAY_MS = 10000;
const uint32_t MIN_DELAY_MS = 1000;
// minimal gap between two event-driven publishes of the same input
const unsigned long EVENT_DEBOUNCE_MS = 300;
const uint8_t NONE = 0xFF;

struct Driver {
    String key; // model:pin:pin2
    ISensor *sensor;
};

struct Channel {
    uint32_t id;
    String type;
    String model;
    uint8_t pin;
    uint8_t pin2;
    uint32_t delay;
    float minValue;
    float maxValue;
    ISensor *sensor;
    unsigned long lastSent;
    bool sentOnce;
    bool forcePublish;
    bool hasValue;
    float lastValue;
};

std::vector<Driver> drivers;
std::vector<Channel> channels;
// commands received before the device appeared in the configuration (retained messages arrive first)
std::map<uint32_t, float> pendingCommands;
String appliedVersion = "";

bool isAnalogModel(const String &model) {
    return model == "MQ2" || model == "ANALOG_INPUT";
}

bool isAnalogPin(uint8_t pin) {
#if defined(ESP8266)
    return pin == A0;
#else
    // ADC2 cannot be used while WiFi is on
    return pin >= 32 && pin <= 39;
#endif
}

// Pins that cannot be used for devices on this board, the reason is written to `reason`.
bool isReservedPin(uint8_t pin, const String &model, const char *&reason) {
#if defined(ESP8266)
    if (pin == A0)
        return false;
    if (pin > 16) {
        reason = "no such GPIO";
        return true;
    }
    if (pin >= 6 && pin <= 11) {
        reason = "connected to flash";
        return true;
    }
#ifdef USE_U8G2
    if (pin == U8G2_CLK_PIN || pin == U8G2_DATA_PIN || pin == U8G2_CS_PIN || pin == U8G2_DC_PIN || pin == U8G2_RST_PIN) {
        reason = "used by display";
        return true;
    }
#endif
#else
    if (pin > 39 || pin == 20 || pin == 24 || (pin >= 28 && pin <= 31)) {
        reason = "no such GPIO";
        return true;
    }
    if (pin >= 6 && pin <= 11) {
        reason = "connected to flash";
        return true;
    }
    if ((pin == DISPLAY_I2C_SDA || pin == DISPLAY_I2C_SCL) && model != "BMP180") {
        reason = "used by display I2C bus";
        return true;
    }
    if (pin >= 34 && pin <= 39 && model == "RELAY") {
        reason = "input only";
        return true;
    }
#endif
    return false;
}

ISensor *createSensor(const String &model, uint8_t pin, uint8_t pin2) {
    if (model == "DHT11")
        return new DHTSensor(pin, DHTesp::DHT11);
    if (model == "DHT22")
        return new DHTSensor(pin, DHTesp::DHT22);
    if (model == "MQ2")
        return new MQ2Sensor(pin);
    if (model == "BMP180")
        return new BMP180Sensor(pin, pin2);
    if (model == "FLAME_IR" || model == "LIGHT_DIGITAL")
        return new DigitalInputSensor(pin, true);
    if (model == "PIR" || model == "DIGITAL_INPUT")
        return new DigitalInputSensor(pin, false);
    if (model == "ANALOG_INPUT")
        return new AnalogInputSensor(pin);
    if (model == "RELAY")
        return new RelayOutput(pin);
    return nullptr;
}

ISensor *driverFor(const String &model, uint8_t pin, uint8_t pin2) {
    String key = model + ":" + String(pin) + ":" + String(pin2);
    for (Driver &d : drivers) {
        if (d.key == key)
            return d.sensor;
    }
    ISensor *sensor = createSensor(model, pin, pin2);
    if (sensor == nullptr)
        return nullptr;
    sensor->init();
    drivers.push_back({key, sensor});
    return sensor;
}

void clearDevices() {
    channels.clear();
    for (Driver &d : drivers) {
        delete d.sensor;
    }
    drivers.clear();
}

String shortLabel(const String &type) {
    if (type == "TEMPERATURE")
        return "T";
    if (type == "HUMIDITY")
        return "H";
    if (type == "PRESSURE")
        return "P";
    if (type == "SMOKE")
        return "Smk";
    if (type == "FLAME")
        return "Flm";
    if (type == "LIGHT")
        return "Lgt";
    if (type == "MOTION")
        return "Mot";
    if (type == "DIGITAL")
        return "In";
    if (type == "ANALOG")
        return "A";
    if (type == "RELAY")
        return "Rly";
    return type; // LPG, CH4
}

String formatValue(const Channel &c) {
    if (!c.hasValue)
        return "--";
    if (c.type == "FLAME" || c.type == "MOTION" || c.type == "DIGITAL" || c.type == "RELAY" ||
        (c.type == "LIGHT" && c.model == "LIGHT_DIGITAL")) {
        if (c.type == "RELAY")
            return c.lastValue > 0.5f ? "ON" : "OFF";
        return c.lastValue > 0.5f ? "YES" : "NO";
    }
    if (c.type == "PRESSURE" || c.type == "LPG" || c.type == "CH4" || c.type == "SMOKE" || c.type == "ANALOG")
        return String(c.lastValue, 0);
    return String(c.lastValue, 1);
}

} // namespace

namespace DeviceManager {

bool applyConfiguration(const uint8_t *payload, unsigned int length) {
    if (length == 0) {
        Serial.println("[CONFIG] Empty configuration, removing all devices");
        clearDevices();
        appliedVersion = "";
        return true;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, (const char *)payload, length);
    if (err) {
        Serial.print("[CONFIG] JSON parse failed: ");
        Serial.println(err.c_str());
        return false;
    }

    String version = doc["v"] | "";
    if (version.length() > 0 && version == appliedVersion) {
        Serial.println("[CONFIG] Configuration " + version + " already applied");
        return true;
    }

    // keep relay states across reconfiguration
    std::map<uint32_t, float> outputs;
    for (Channel &c : channels) {
        if (c.model == "RELAY" && c.hasValue)
            outputs[c.id] = c.lastValue;
    }

    clearDevices();

    JsonArray devices = doc["devices"].as<JsonArray>();
    for (JsonObject d : devices) {
        Channel c;
        c.id = d["id"] | 0UL;
        c.type = d["type"] | "UNKNOWN";
        c.model = d["model"] | "";
        int pin = d["pin"] | -1;
        int pin2 = d["pin2"] | -1;
        c.pin = pin < 0 ? NONE : (uint8_t)pin;
        c.pin2 = pin2 < 0 ? NONE : (uint8_t)pin2;
        uint32_t delayMs = d["delay"] | 0UL;
        c.delay = delayMs == 0 ? DEFAULT_DELAY_MS : max(delayMs, MIN_DELAY_MS);
        c.minValue = d["min"] | NAN;
        c.maxValue = d["max"] | NAN;
        c.lastSent = 0;
        c.sentOnce = false;
        c.forcePublish = false;
        c.hasValue = false;
        c.lastValue = 0;

        const char *reason = "";
        if (c.id == 0 || c.model.length() == 0 || c.pin == NONE) {
            Serial.printf("[CONFIG] Skipping incomplete device %lu\n", (unsigned long)c.id);
            continue;
        }
        if (isReservedPin(c.pin, c.model, reason) || (c.pin2 != NONE && isReservedPin(c.pin2, c.model, reason))) {
            Serial.printf("[CONFIG] Skipping device %lu: pin %u %s\n", (unsigned long)c.id, c.pin, reason);
            continue;
        }
        if (isAnalogModel(c.model) && !isAnalogPin(c.pin)) {
            Serial.printf("[CONFIG] Skipping device %lu: pin %u is not an analog input\n", (unsigned long)c.id, c.pin);
            continue;
        }
        if (c.model == "BMP180" && c.pin2 == NONE) {
            Serial.printf("[CONFIG] Skipping device %lu: BMP180 needs SDA and SCL\n", (unsigned long)c.id);
            continue;
        }

        c.sensor = driverFor(c.model, c.pin, c.model == "BMP180" ? c.pin2 : NONE);
        if (c.sensor == nullptr) {
            Serial.printf("[CONFIG] Skipping device %lu: unknown model %s\n", (unsigned long)c.id, c.model.c_str());
            continue;
        }

        auto out = outputs.find(c.id);
        if (out != outputs.end())
            c.sensor->write(out->second);

        Serial.printf("[CONFIG] Device %lu: %s via %s pin %u%s, every %lu ms\n", (unsigned long)c.id, c.type.c_str(),
                      c.model.c_str(), c.pin, c.pin2 != NONE ? (String("/") + c.pin2).c_str() : "", (unsigned long)c.delay);
        channels.push_back(c);
    }

    // apply commands that arrived before the configuration
    for (auto it = pendingCommands.begin(); it != pendingCommands.end();) {
        bool applied = false;
        for (Channel &c : channels) {
            if (c.id == it->first && c.sensor->write(it->second)) {
                c.forcePublish = true;
                applied = true;
            }
        }
        it = applied ? pendingCommands.erase(it) : std::next(it);
    }

    appliedVersion = version;
    Serial.printf("[CONFIG] Applied configuration %s with %u devices\n", version.c_str(), (unsigned)channels.size());
    return true;
}

const String &configVersion() {
    return appliedVersion;
}

void handleCommand(uint32_t deviceId, float value) {
    for (Channel &c : channels) {
        if (c.id == deviceId) {
            if (c.sensor->write(value)) {
                c.forcePublish = true; // report the new state right away
            } else {
                Serial.printf("[CMD] Device %lu does not accept commands\n", (unsigned long)deviceId);
            }
            return;
        }
    }
    pendingCommands[deviceId] = value;
}

void loop() {
    for (Driver &d : drivers) {
        d.sensor->update();
        yield();
    }

    unsigned long now = millis();
    for (Channel &c : channels) {
        float value;
        if (!c.sensor->read(c.type, value)) {
            continue;
        }

        bool changed = !c.hasValue || value != c.lastValue;
        c.lastValue = value;
        c.hasValue = true;

        bool due = !c.sentOnce || now - c.lastSent >= c.delay;
        bool event = c.sensor->isEventDriven() && changed && now - c.lastSent >= EVENT_DEBOUNCE_MS;
        if (!(due || event || c.forcePublish)) {
            continue;
        }

        if (publishMeasurement(c.id, value)) {
            c.lastSent = now;
            c.sentOnce = true;
            c.forcePublish = false;
        }
    }
}

void render() {
    if (!oled.isInitialized())
        return;

    std::vector<String> items;
    for (Channel &c : channels) {
        items.push_back(shortLabel(c.type) + ":" + formatValue(c));
    }

    bool online = WiFi.status() == WL_CONNECTED && mqttConnected();
    String status = String(online ? "+ " : "- ") + (channels.empty() ? "no config" : String(channels.size()) + " dev");

    oled.clear();
    if (isPairing()) {
        oled.printLine(0, "Link to account:");
        oled.printLine(1, SITE_HOST "/pair");
        oled.printLine(2, pairingCode().length() ? "Code: " + pairingCode() : String("Getting code..."));
        oled.printLine(4, status);
        oled.show();
        return;
    }
    if (items.empty()) {
        oled.printLine(0, "Waiting config");
        oled.printLine(1, "Add devices in UI");
        oled.printLine(2, hardwareId());
        oled.printLine(4, status);
        oled.show();
        return;
    }

    // two columns, the last line shows connection state
    const int rows = 4;
    for (size_t i = 0; i < items.size() && i < (size_t)rows * 2; i++) {
        size_t row = i % rows;
        bool right = i >= (size_t)rows;
        oled.printAt(right ? 64 : 0, row, items[i]);
    }
    oled.printAt(0, rows, status);
    oled.show();
}

size_t deviceCount() {
    return channels.size();
}

} // namespace DeviceManager
