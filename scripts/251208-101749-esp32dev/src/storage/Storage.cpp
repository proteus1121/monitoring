#include "Storage.h"
#include <Preferences.h>

static Preferences prefs;

void Storage::begin() {
    // Open namespace "monitor" for RW access
    prefs.begin("monitor", false);
}

// =============================
//          WI-FI
// =============================
void Storage::saveCredentials(const String &ssid, const String &pass) {
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
}

String Storage::loadSSID() {
    if (!prefs.isKey("ssid"))
        return String("");
    return prefs.getString("ssid", "");
}

String Storage::loadPASS() {
    if (!prefs.isKey("pass"))
        return String("");
    return prefs.getString("pass", "");
}

// =============================
//         USER ID
// =============================
void Storage::saveUserId(const String &userId) {
    prefs.putString("userid", userId);
}

String Storage::loadUserId() {
    if (!prefs.isKey("userid"))
        return String("");
    return prefs.getString("userid", "");
}

// =============================
//       MQTT USERNAME
// =============================
void Storage::saveMqttUser(const String &user) {
    prefs.putString("mqtt_user", user);
}

String Storage::loadMqttUser() {
    if (!prefs.isKey("mqtt_user"))
        return String("");
    return prefs.getString("mqtt_user", "");
}

// =============================
//       MQTT PASSWORD
// =============================
void Storage::saveMqttPass(const String &pass) {
    prefs.putString("mqtt_pass", pass);
}

String Storage::loadMqttPass() {
    if (!prefs.isKey("mqtt_pass"))
        return String("");
    return prefs.getString("mqtt_pass", "");
}

// =============================
//       MQTT SERVER
// =============================
void Storage::saveMqttServer(const String &server) {
    prefs.putString("mqtt_server", server);
}

String Storage::loadMqttServer() {
    if (!prefs.isKey("mqtt_server"))
        return String("");
    return prefs.getString("mqtt_server", "");
}

// =============================
//       MQTT PORT
// =============================
void Storage::saveMqttPort(uint16_t port) {
    prefs.putString("mqtt_port", String(port));
}

uint16_t Storage::loadMqttPort() {
    if (!prefs.isKey("mqtt_port"))
        return 0;
    String s = prefs.getString("mqtt_port", "0");
    return (uint16_t)s.toInt();
}

void Storage::sync() {
    // Close preferences to ensure data is flushed to NVS
    prefs.end();
}
