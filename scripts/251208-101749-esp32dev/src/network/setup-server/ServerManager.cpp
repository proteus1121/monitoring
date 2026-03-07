#include "ServerManager.h"
#include "storage/Storage.h"
#if defined(ESP8266)
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <base64.h> // required by ESP8266WebServer implementation
#else
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#endif

// instantiate correct server type for the platform
#if defined(ESP8266)
static ESP8266WebServer server(80);
#else
static WebServer server(80);
#endif

// common state for both boards
static String savedSSID = "";
static String savedPASS = "";
static bool wifiConfigured = false;

#if defined(ESP8266)
String ServerManager::apSsid = "ESP8266-Setup";
#else
String ServerManager::apSsid = "ESP32-Setup";
#endif
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
void ServerManager::scanWiFiNetworks() {
    Serial.println("[DEBUG] Scanning available WiFi networks...");
    WiFi.mode(WIFI_STA);
    int numNetworks = WiFi.scanNetworks();

    if (numNetworks == 0) {
        Serial.println("[DEBUG] No WiFi networks found!");
        return;
    }

    Serial.print("[DEBUG] Found ");
    Serial.print(numNetworks);
    Serial.println(" networks:");

    bool found = false;
    for (int i = 0; i < numNetworks; i++) {
        String ssid = WiFi.SSID(i);
        int rssi = WiFi.RSSI(i);

        Serial.print("  [");
        Serial.print(i);
        Serial.print("] ");
        Serial.print(ssid);
        Serial.print(" (RSSI: ");
        Serial.print(rssi);
        Serial.println(" dBm)");

        if (ssid == savedSSID) {
            found = true;
            Serial.println("       ^ THIS IS OUR TARGET NETWORK");
        }
    }

    if (!found) {
        Serial.println("[DEBUG] WARNING: Saved SSID 'Proteus' not found in scan results!");
    }
}

bool ServerManager::tryConnectWiFi() {
    if (savedSSID.isEmpty())
        return false;

    // perform scan once to verify network visibility
    static bool scannedOnce = false;
    if (!scannedOnce) {
        scanWiFiNetworks();
        scannedOnce = true;
    }

    // reset radio before attempting connection
    Serial.println("[DEBUG] Preparing WiFi for connection...");
    WiFi.disconnect(false); // just disconnect, don't disable radio
    delay(300);
    WiFi.mode(WIFI_STA);
#if defined(ESP8266)
    WiFi.setPhyMode(WIFI_PHY_MODE_11G);
#endif
    delay(200);

    Serial.print("Connecting to WiFi: ");
    Serial.println(savedSSID);
    Serial.print("[DEBUG] Using password: ");
    Serial.println(savedPASS);

    // Configure DNS servers for better connectivity (optional but recommended)
    // Note: ESP32's Arduino WiFi defaults to DHCP with Google DNS, so explicit config usually not needed
    // If you want to set DNS manually, uncomment and adjust:
    // IPAddress primaryDNS(8, 8, 8, 8);      // Google primary
    // IPAddress secondaryDNS(8, 8, 4, 4);    // Google secondary
    // WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, primaryDNS, secondaryDNS);

    // Add small delay before beginning connection
    delay(100);

    Serial.print("[DEBUG] Starting WiFi.begin()...");
    WiFi.begin(savedSSID.c_str(), savedPASS.c_str());

    // Use polling with 20 second timeout to check connection status
    unsigned long startTime = millis();
    int status = WiFi.status();
    while (millis() - startTime < 100000 && status != WL_CONNECTED) {
        delay(500);
        status = WiFi.status();
        Serial.print(".");
    }
    Serial.println();

    Serial.print("[DEBUG] WiFi.status returned: ");
    Serial.println(status);
    // Status codes: 0=IDLE, 1=NO_SSID_AVAIL, 2=SCAN_COMPLETED, 3=CONNECTED, 4=CONNECT_FAILED, 5=CONNECTION_LOST, 6=DISCONNECTED
    if (status == WL_CONNECTED) {
        Serial.println("[DEBUG] - CONNECTED!");
        Serial.print("[DEBUG] IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("[DEBUG] Gateway: ");
        Serial.println(WiFi.gatewayIP());
        Serial.print("[DEBUG] Subnet: ");
        Serial.println(WiFi.subnetMask());
    } else if (status == WL_CONNECT_FAILED) {
        Serial.println("[DEBUG] - CONNECT_FAILED (Wrong password or network not found?)");
    } else if (status == WL_NO_SSID_AVAIL) {
        Serial.println("[DEBUG] - NO_SSID_AVAILABLE (WiFi network not found)");
    } else if (status == WL_DISCONNECTED) {
        Serial.println("[DEBUG] - DISCONNECTED (Timeout waiting for connection)");
    } else if (status == WL_IDLE_STATUS) {
        Serial.println("[DEBUG] - IDLE (Connection process did not start)");
    } else {
        Serial.print("[DEBUG] - UNKNOWN STATUS ");
        Serial.println(status);
    }

    return status == WL_CONNECTED;
}

// =========================
//  AP mode
// =========================
// public helper forwards to private startAPMode
void ServerManager::enterSetupMode() {
    startAPMode();
}

void ServerManager::startAPMode() {
    Serial.println("Starting WiFi setup AP…");

    // mark configuration state as false so sketch loop will display setup info
    wifiConfigured = false;

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
    Serial.print("[DEBUG] savedPASS: '");
    Serial.print(savedPASS);
    Serial.println("'");
    Serial.print("[DEBUG] savedSSID.isEmpty(): ");
    Serial.println(savedSSID.isEmpty());

    bool success = false;
    // try a few times before giving up and switching to AP mode
    for (int attempt = 1; attempt <= WIFI_CONNECT_RETRIES; ++attempt) {
        Serial.print("[DEBUG] WiFi connect attempt ");
        Serial.println(attempt);
        if (tryConnectWiFi()) {
            success = true;
            break;
        }
        // Between attempts, wait longer and reset WiFi radio state
        Serial.println("[DEBUG] Attempt failed, resetting WiFi...");
        WiFi.disconnect(false);
        delay(1000); // wait 1 second between attempts
    }

    if (success) {
        wifiConfigured = true;
        Serial.println("Connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        wifiConfigured = false;
        Serial.println("[DEBUG] WiFi connection failed after " + String(WIFI_CONNECT_RETRIES) + " attempts, starting AP mode");
        startAPMode();
    }
}

void ServerManager::loop() {
    server.handleClient();
}

bool ServerManager::isConfigured() {
    return wifiConfigured;
}
