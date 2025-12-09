#include "Storage.h"

static const int EEPROM_SIZE = 256;

static const int SSID_ADDR = 0;       // [len][data]
static const int PASS_ADDR = 64;      // [len][data]

void Storage::begin() {
    EEPROM.begin(EEPROM_SIZE);
}

void Storage::saveCredentials(const String &ssid, const String &pass) {
    // --- Save SSID --- //
    uint8_t len = ssid.length();
    EEPROM.write(SSID_ADDR, len);
    for (int i = 0; i < len; i++) {
        EEPROM.write(SSID_ADDR + 1 + i, ssid[i]);
    }

    // --- Save PASS --- //
    uint8_t len2 = pass.length();
    EEPROM.write(PASS_ADDR, len2);
    for (int i = 0; i < len2; i++) {
        EEPROM.write(PASS_ADDR + 1 + i, pass[i]);
    }

    EEPROM.commit();
}

String Storage::loadSSID() {
    uint8_t len = EEPROM.read(SSID_ADDR);
    if (len == 0 || len > 32) return "";

    char buf[33];
    for (int i = 0; i < len; i++) {
        buf[i] = EEPROM.read(SSID_ADDR + 1 + i);
    }
    buf[len] = '\0';

    return String(buf);
}

String Storage::loadPASS() {
    uint8_t len = EEPROM.read(PASS_ADDR);
    if (len == 0 || len > 64) return "";

    char buf[65];
    for (int i = 0; i < len; i++) {
        buf[i] = EEPROM.read(PASS_ADDR + 1 + i);
    }
    buf[len] = '\0';

    return String(buf);
}
