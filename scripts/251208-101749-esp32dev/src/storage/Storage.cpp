#include "Storage.h"
#if defined(ESP8266)
#include <EEPROM.h>
#define EEPROM_SSID_ADDR 0
#define EEPROM_PASS_ADDR 32
#define EEPROM_USERID_ADDR 64
#define EEPROM_MQTT_SERVER_ADDR 96
#define EEPROM_MQTT_PORT_ADDR 128
#define EEPROM_MQTT_USER_ADDR 132
#define EEPROM_MQTT_PASS_ADDR 164
#else
#include <Preferences.h>
#endif

#if defined(ESP8266)
EEPROMClass &prefs = EEPROM;
#else
Preferences prefs;
#endif

void Storage::begin() {
#if defined(ESP8266)
    EEPROM.begin(512);
#else
    prefs.begin("monitoring", false);
#endif
}

// =============================
//          WI-FI
// =============================
void Storage::saveCredentials(const String &ssid, const String &pass) {
#if defined(ESP8266)
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_SSID_ADDR + i, i < ssid.length() ? ssid[i] : 0);
    }
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_PASS_ADDR + i, i < pass.length() ? pass[i] : 0);
    }
#else
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
#endif
}

String Storage::loadSSID() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_SSID_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("ssid"))
        return String("");
    return prefs.getString("ssid", "");
#endif
}

String Storage::loadPASS() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_PASS_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("pass"))
        return String("");
    return prefs.getString("pass", "");
#endif
}

// =============================
//         USER ID
// =============================
void Storage::saveUserId(const String &userId) {
#if defined(ESP8266)
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_USERID_ADDR + i, i < userId.length() ? userId[i] : 0);
    }
#else
    prefs.putString("userid", userId);
#endif
}

String Storage::loadUserId() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_USERID_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("userid"))
        return String("");
    return prefs.getString("userid", "");
#endif
}

// =============================
//       MQTT USERNAME
// =============================
void Storage::saveMqttUser(const String &user) {
#if defined(ESP8266)
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_MQTT_USER_ADDR + i, i < user.length() ? user[i] : 0);
    }
#else
    prefs.putString("mqtt_user", user);
#endif
}

String Storage::loadMqttUser() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_MQTT_USER_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("mqtt_user"))
        return String("");
    return prefs.getString("mqtt_user", "");
#endif
}

// =============================
//       MQTT PASSWORD
// =============================
void Storage::saveMqttPass(const String &pass) {
#if defined(ESP8266)
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_MQTT_PASS_ADDR + i, i < pass.length() ? pass[i] : 0);
    }
#else
    prefs.putString("mqtt_pass", pass);
#endif
}

String Storage::loadMqttPass() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_MQTT_PASS_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("mqtt_pass"))
        return String("");
    return prefs.getString("mqtt_pass", "");
#endif
}

// =============================
//       MQTT SERVER
// =============================
void Storage::saveMqttServer(const String &server) {
#if defined(ESP8266)
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_MQTT_SERVER_ADDR + i, i < server.length() ? server[i] : 0);
    }
#else
    prefs.putString("mqtt_server", server);
#endif
}

String Storage::loadMqttServer() {
#if defined(ESP8266)
    char buf[33];
    for (int i = 0; i < 32; i++) {
        buf[i] = EEPROM.read(EEPROM_MQTT_SERVER_ADDR + i);
    }
    buf[32] = 0;
    return String(buf);
#else
    if (!prefs.isKey("mqtt_server"))
        return String("");
    return prefs.getString("mqtt_server", "");
#endif
}

// =============================
//       MQTT PORT
// =============================
void Storage::saveMqttPort(uint16_t port) {
#if defined(ESP8266)
    EEPROM.put(EEPROM_MQTT_PORT_ADDR, port);
#else
    prefs.putString("mqtt_port", String(port));
#endif
}

uint16_t Storage::loadMqttPort() {
#if defined(ESP8266)
    uint16_t port;
    EEPROM.get(EEPROM_MQTT_PORT_ADDR, port);
    return port;
#else
    if (!prefs.isKey("mqtt_port"))
        return 0;
    String s = prefs.getString("mqtt_port", "0");
    return (uint16_t)s.toInt();
#endif
}

void Storage::sync() {
#if defined(ESP8266)
    EEPROM.commit();
#else
    // Close preferences to ensure data is flushed to NVS
    prefs.end();
#endif
}
