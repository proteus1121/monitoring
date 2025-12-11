#include "ServerManager.h"
#include "storage/Storage.h"
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>

static WebServer server(80);

static String savedSSID = "";
static String savedPASS = "";
static bool wifiConfigured = false;

// initialize static variables
String ServerManager::apSsid = "ESP32-Setup";
String ServerManager::apPass = ""; // will generate random

// =========================
//  Helper to generate random password
// =========================
String generateRandomPass(int length = 8) {
    const char charset[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    String pass = "";
    for (int i = 0; i < length; i++) {
        pass += charset[random(0, sizeof(charset) - 1)];
    }
    return pass;
}

// =========================
//  Public getters
// =========================
String ServerManager::getSsid() {
    // SSID of ESP32 for configuration
    return apSsid;
}

String ServerManager::getPass() {
    return apPass;
}

String ServerManager::getSavedSsid() {
    // SSID of your Wi-fi
    return savedSSID;
}

// =========================
//  Web handlers
// =========================
void ServerManager::handleRootPage() {
    // Prefill existing values
    String curSsid = Storage::loadSSID();
    String curPass = Storage::loadPASS();
    String curUserId = Storage::loadUserId();
    String curMqttServer = Storage::loadMqttServer();
    uint16_t curMqttPort = Storage::loadMqttPort();
    String curMqttUser = Storage::loadMqttUser();
    String curMqttPass = Storage::loadMqttPass();

    // Defaults (match MQTTHandler defaults)
    const String DEFAULT_MQTT_SERVER = String("139.59.148.159");
    const uint16_t DEFAULT_MQTT_PORT = 1883;
    const String DEFAULT_MQTT_USER = String("proteus1121");
    const String DEFAULT_MQTT_PASS = String("SecureMonitoringProteus1121");

    if (curMqttServer.length() == 0)
        curMqttServer = DEFAULT_MQTT_SERVER;
    if (curMqttPort == 0)
        curMqttPort = DEFAULT_MQTT_PORT;
    if (curMqttUser.length() == 0)
        curMqttUser = DEFAULT_MQTT_USER;
    if (curMqttPass.length() == 0)
        curMqttPass = DEFAULT_MQTT_PASS;
    String html = "<!doctype html><html><head>";
    html += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
    html += "<meta charset=\"utf-8\">";
    html += "<style>body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:12px;background:#f6f7fb;color:#111} .card{background:#fff;border-radius:8px;padding:12px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08)} h2{margin:0 0 8px 0;font-size:18px} label{display:block;margin:8px 0 4px 0;font-weight:600;font-size:14px} input[type=text], input[type=password], input[type=number]{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box} .row{display:flex;gap:8px} .submit{display:block;width:100%;padding:12px;border:0;background:#0078d4;color:#fff;border-radius:6px;font-size:16px} small{color:#666}</style>";
    html += "</head><body>";
    html += "<h2>Device Setup</h2>";
    html += "<form action='/save' method='get'>";

    html += "<div class='card'><h3>WiFi</h3>";
    html += "<label for='ssid'>SSID</label><input id='ssid' name='ssid' type='text' value='" + curSsid + "'>";
    html += "<label for='pass'>Password</label><input id='pass' name='pass' type='password' value='" + curPass + "'>";
    html += "</div>";

    html += "<div class='card'><h3>MQTT / Account</h3>";
    html += "<label for='userId'>User ID</label><input id='userId' name='userId' type='text' value='" + curUserId + "'>";
    html += "<label for='mqtt_server'>MQTT Server</label><input id='mqtt_server' name='mqtt_server' type='text' value='" + curMqttServer + "'>";
    html += "<label for='mqtt_port'>MQTT Port</label><input id='mqtt_port' name='mqtt_port' type='number' value='" + String(curMqttPort) + "'>";
    html += "<label for='mqtt_user'>MQTT User</label><input id='mqtt_user' name='mqtt_user' type='text' value='" + curMqttUser + "'>";
    html += "<label for='mqtt_pass'>MQTT Password</label><input id='mqtt_pass' name='mqtt_pass' type='password' value='" + curMqttPass + "'>";
    html += "<small>Leave MQTT fields empty to keep current values.</small>";
    html += "</div>";

    html += "<button class='submit' type='submit'>Save & Reboot</button>";
    html += "</form>";
    html += "</body></html>";
    server.send(200, "text/html", html);
}

void ServerManager::handleSavePage() {
    // Save WiFi credentials if provided
    if (server.hasArg("ssid") && server.hasArg("pass")) {
        String ssid = server.arg("ssid");
        String pass = server.arg("pass");
        if (ssid.length() > 0) {
            Storage::saveCredentials(ssid, pass);
            Serial.println("WiFi credentials saved!");
        }
    }

    // Save userId if provided
    if (server.hasArg("userId")) {
        String userId = server.arg("userId");
        if (userId.length() > 0) {
            Storage::saveUserId(userId);
            Serial.println("User ID saved: " + userId);
        }
    }

    // Save MQTT server/port/user/pass if provided
    if (server.hasArg("mqtt_server")) {
        String mqttServer = server.arg("mqtt_server");
        if (mqttServer.length() > 0) {
            Storage::saveMqttServer(mqttServer);
            Serial.println("MQTT server saved: " + mqttServer);
        }
    }

    if (server.hasArg("mqtt_port")) {
        String portStr = server.arg("mqtt_port");
        if (portStr.length() > 0) {
            uint16_t port = (uint16_t)portStr.toInt();
            if (port > 0) {
                Storage::saveMqttPort(port);
                Serial.print("MQTT port saved: ");
                Serial.println(port);
            }
        }
    }

    if (server.hasArg("mqtt_user")) {
        String mqttUser = server.arg("mqtt_user");
        if (mqttUser.length() > 0) {
            Storage::saveMqttUser(mqttUser);
            Serial.println("MQTT user saved: " + mqttUser);
        }
    }

    if (server.hasArg("mqtt_pass")) {
        String mqttPass = server.arg("mqtt_pass");
        if (mqttPass.length() > 0) {
            Storage::saveMqttPass(mqttPass);
            Serial.println("MQTT pass saved");
        }
    }

    // Ensure preferences are flushed/closed before reboot
    Storage::sync();
    delay(300);
    server.send(200, "text/html", "<html><body><h3>Saved! Rebooting...</h3></body></html>");
    delay(1200);
    ESP.restart();
}

// =========================
//  Wi-Fi logic
// =========================
bool ServerManager::tryConnectWiFi() {
    if (savedSSID.isEmpty())
        return false;

    Serial.print("Connecting to WiFi: ");
    Serial.println(savedSSID);

    WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
        delay(300);
        Serial.print(".");
    }
    Serial.println();
    return WiFi.status() == WL_CONNECTED;
}

// =========================
//  AP mode
// =========================
void ServerManager::startAPMode() {
    Serial.println("Starting WiFi setup AP…");

    WiFi.disconnect(false);
    delay(200);

    // Generate random password
    apPass = "yLDJAYuf"; // generateRandomPass(8);

    WiFi.mode(WIFI_AP);
    delay(200);
    // Start AP on channel 1, visible
    bool ok = WiFi.softAP(apSsid.c_str(), apPass.c_str(), 1, false);
    if (!ok) {
        Serial.println("[ERROR] softAP start failed!");
        return;
    }
    delay(200);

    Serial.print("Connect to AP: ");
    Serial.println(apSsid);
    Serial.print("Password: ");
    Serial.println(apPass);
    Serial.print("Open: http://");
    Serial.println(WiFi.softAPIP());

    server.on("/", ServerManager::handleRootPage);
    server.on("/save", ServerManager::handleSavePage);

    server.begin();
}

// =========================
//  Public functions
// =========================

void ServerManager::begin() {

    randomSeed(micros()); // for password generation

    savedSSID = Storage::loadSSID();
    savedPASS = Storage::loadPASS();

    Serial.println("Saved SSID: " + savedSSID);
}

void ServerManager::connect() {

    WiFi.mode(WIFI_STA);
    Serial.print("[DEBUG] savedSSID: '");
    Serial.print(savedSSID);
    Serial.println("'");
    Serial.print("[DEBUG] savedSSID.isEmpty(): ");
    Serial.println(savedSSID.isEmpty());

    if (tryConnectWiFi()) {
        wifiConfigured = true;
        Serial.println("Connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        wifiConfigured = false;
        Serial.println("[DEBUG] WiFi connection failed, starting AP mode");
        startAPMode();
    }
}

void ServerManager::loop() {
    server.handleClient();
}

bool ServerManager::isConfigured() {
    return wifiConfigured;
}
