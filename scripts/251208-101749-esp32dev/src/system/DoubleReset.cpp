#include "DoubleReset.h"
#include <Arduino.h>

#if defined(ESP8266)
#include <user_interface.h>
#else
#include <Preferences.h>
#endif

namespace {

const uint32_t FLAG = 0xD0B1E5E7;
const unsigned long WINDOW_MS = 3000;

bool armed = false;
unsigned long armedAt = 0;

#if defined(ESP8266)
// RTC user memory offset in 4-byte blocks, far from the area OTA / the SDK use
const uint32_t RTC_OFFSET = 64;

uint32_t readFlag() {
    uint32_t value = 0;
    ESP.rtcUserMemoryRead(RTC_OFFSET, &value, sizeof(value));
    return value;
}

void writeFlag(uint32_t value) {
    ESP.rtcUserMemoryWrite(RTC_OFFSET, &value, sizeof(value));
}
#else
uint32_t readFlag() {
    Preferences prefs;
    prefs.begin("drd", true);
    uint32_t value = prefs.getUInt("flag", 0);
    prefs.end();
    return value;
}

void writeFlag(uint32_t value) {
    Preferences prefs;
    prefs.begin("drd", false);
    prefs.putUInt("flag", value);
    prefs.end();
}
#endif

} // namespace

namespace DoubleReset {

bool detect() {
    if (readFlag() == FLAG) {
        writeFlag(0);
        Serial.println("[RESET] Double reset detected, opening setup");
        return true;
    }
    writeFlag(FLAG);
    armed = true;
    armedAt = millis();
    return false;
}

void loop() {
    if (armed && millis() - armedAt > WINDOW_MS) {
        writeFlag(0);
        armed = false;
    }
}

} // namespace DoubleReset
