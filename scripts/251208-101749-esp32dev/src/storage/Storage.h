#pragma once
#include <EEPROM.h>

class Storage {
public:
    static void begin();
    static void saveCredentials(const String& ssid, const String& pass);
    static String loadSSID();
    static String loadPASS();
};
