#include "DeviceManager.h"
#include "../display/DisplayManager.h"
#include "../display/Screens.h"
#include "../storage/Storage.h"
#include "../network/mqtt/MQTTHandler.h"
#include "../sensors/ISensor.h"
#include "../sensors/analog/AnalogInputSensor.h"
#include "../sensors/soil/SoilMoistureSensor.h"
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
    return model == "MQ2" || model == "ANALOG_INPUT" || model == "SOIL_MOISTURE";
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
    if (pin == 0) {
        reason = "BOOT / FLASH button";
        return true;
    }
    // a BMP180 may share the bus of an I2C display
    if (oled.usesPin(pin) && !(model == "BMP180" && oled.config().isI2c())) {
        reason = "used by display";
        return true;
    }
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
#else
    if (pin > 39 || pin == 20 || pin == 24 || (pin >= 28 && pin <= 31)) {
        reason = "no such GPIO";
        return true;
    }
    if (pin >= 6 && pin <= 11) {
        reason = "connected to flash";
        return true;
    }
    if (pin >= 34 && pin <= 39 && model == "RELAY") {
        reason = "input only";
        return true;
    }
#endif
    return false;
}

bool restartPending = false;

// Display from the configuration; true when it differs from the running one and was saved for a restart.
bool applyDisplay(JsonObject display) {
    if (display.isNull())
        return false;
    DisplayConfig config{DisplayConfig::modelFromName(display["model"] | ""), {0, 0, 0, 0, 0}, display["flip"] | false};
    JsonArray pins = display["pins"].as<JsonArray>();
    if (pins.size() != config.pinCount()) {
        Serial.println("[CONFIG] Display ignored: wrong number of pins");
        return false;
    }
    for (uint8_t i = 0; i < config.pinCount(); i++) {
        config.pins[i] = pins[i] | 0;
    }
    if (config == oled.config())
        return false;
    Serial.printf("[CONFIG] New display %s, restarting to apply it\n", DisplayConfig::modelName(config.model));
    Storage::saveDisplay(config);
    Storage::sync();
    restartPending = true;
    return true;
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
    if (model == "SOIL_MOISTURE")
        return new SoilMoistureSensor(pin);
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

// names and units as on the site (src/frontend/src/lib/readings.ts)
String tileLabel(const String &type) {
    if (type == "TEMPERATURE")
        return "Temperature";
    if (type == "HUMIDITY")
        return "Humidity";
    if (type == "PRESSURE")
        return "Pressure";
    if (type == "SMOKE")
        return "Smoke";
    if (type == "FLAME")
        return "Flame";
    if (type == "LIGHT")
        return "Light";
    if (type == "MOTION")
        return "Motion";
    if (type == "DIGITAL")
        return "Input";
    if (type == "ANALOG")
        return "Analog";
    if (type == "SOIL_MOISTURE")
        return "Soil";
    if (type == "RELAY")
        return "Relay";
    if (type == "CH4")
        return "Methane";
    return type; // LPG
}

Screens::Tile toTile(const Channel &c) {
    Screens::Tile t{tileLabel(c.type), "--", "", false};
    bool binary = c.type == "FLAME" || c.type == "MOTION" || c.type == "DIGITAL" || c.type == "RELAY" ||
                  (c.type == "LIGHT" && c.model == "LIGHT_DIGITAL");
    if (binary) {
        if (!c.hasValue)
            return t;
        bool high = c.lastValue > 0.5f;
        if (c.type == "FLAME")
            t.value = high ? "FLAME!" : "none";
        else if (c.type == "MOTION")
            t.value = high ? "motion" : "still";
        else if (c.type == "LIGHT")
            t.value = high ? "light" : "dark";
        else if (c.type == "RELAY")
            t.value = high ? "ON" : "OFF";
        else
            t.value = high ? "high" : "low";
        // things worth noticing from across the room
        t.alert = high && (c.type == "FLAME" || c.type == "MOTION");
        return t;
    }
    if (c.type == "TEMPERATURE")
        t.unit = "\xC2\xB0" "C";
    else if (c.type == "HUMIDITY" || c.type == "SOIL_MOISTURE")
        t.unit = "%";
    else if (c.type == "PRESSURE")
        t.unit = "hPa";
    else if (c.type == "LPG" || c.type == "CH4" || c.type == "SMOKE")
        t.unit = "ppm";
    if (c.hasValue)
        t.value = String(c.lastValue, fabsf(c.lastValue) >= 100 ? 0 : 1);
    return t;
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

    // devices may need the pins of the old display: they are applied after the restart
    if (applyDisplay(doc["display"].as<JsonObject>())) {
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
    if (!isLinked()) {
        Screens::link(WiFi.localIP().toString());
        return;
    }
    if (channels.empty()) {
        Screens::waitingForDevices(SITE_HOST, hardwareId());
        return;
    }
    std::vector<Screens::Tile> tiles;
    for (Channel &c : channels)
        tiles.push_back(toTile(c));
    Screens::devices(tiles);
}

bool restartRequested() {
    return restartPending;
}

bool usesPin(uint8_t pin) {
    for (Channel &c : channels) {
        if (c.pin == pin || (c.pin2 != NONE && c.pin2 == pin))
            return true;
    }
    return false;
}

void reinitI2c() {
    for (Driver &d : drivers) {
        if (d.key.startsWith("BMP180:"))
            d.sensor->init();
    }
}

size_t deviceCount() {
    return channels.size();
}

} // namespace DeviceManager
