#pragma once
#include <Arduino.h>
#include <EEPROM.h>
#include "../display/DisplayManager.h"

class Storage {
public:
    static void begin();

    static void saveCredentials(const String &ssid, const String &pass);
    static String loadSSID();
    static String loadPASS();

    static void saveUserId(const String &userId);
    static String loadUserId();

    static void saveMqttUser(const String &user);
    static String loadMqttUser();

    static void saveMqttPass(const String &pass);
    static String loadMqttPass();

    static void saveMqttServer(const String &server);
    static String loadMqttServer();

    static void saveMqttPort(uint16_t port);
    static uint16_t loadMqttPort();

    // display configured on the site; false when none was saved yet
    static void saveDisplay(const DisplayConfig &config);
    static bool loadDisplay(DisplayConfig &config);

    // Ensure preferences are flushed/closed before reboot
    static void sync();
};
