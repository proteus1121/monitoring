#include "ServerManager.h"
#include <WiFi.h>
#include <Preferences.h>
#include <WebServer.h>
#include "storage/Storage.h"

static WebServer server(80);

static String savedSSID = "";
static String savedPASS = "";
static bool wifiConfigured = false;

// initialize static variables
String ServerManager::apSsid = "ESP32-Setup";
String ServerManager::apPass = "";  // will generate random

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
    String html =
        "<html><body>"
        "<h2>WiFi Setup</h2>"
        "<form action='/save'>"
        "SSID:<br><input name='ssid'><br>"
        "Password:<br><input name='pass' type='password'><br><br>"
        "<input type='submit' value='Save'>"
        "</form>"
        "</body></html>";
    server.send(200, "text/html", html);
}

void ServerManager::handleSavePage() {
    if (!server.hasArg("ssid") || !server.hasArg("pass")) {
        server.send(400, "text/plain", "Missing ssid/pass");
        return;
    }

    String ssid = server.arg("ssid");
    String pass = server.arg("pass");

    Storage::saveCredentials(ssid, pass);

    Serial.println("WiFi credentials saved!");

    server.send(200, "text/html", "<html><body><h3>Saved! Rebooting...</h3></body></html>");
    delay(2000);
    ESP.restart();
}

// =========================
//  Wi-Fi logic
// =========================
bool ServerManager::tryConnectWiFi() {
    if (savedSSID.isEmpty()) return false;

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

    WiFi.disconnect(true);
    delay(200);

    // Generate random password
    apPass = "yLDJAYuf"; // generateRandomPass(8);

    WiFi.mode(WIFI_AP);
    delay(200);

    bool ok = WiFi.softAP(apSsid.c_str(), apPass.c_str());
    if (!ok) {
        Serial.println("[ERROR] softAP start failed!");
        return;
    }
    delay(200);

    Serial.print("Connect to AP: "); Serial.println(apSsid);
    Serial.print("Password: "); Serial.println(apPass);
    Serial.print("Open: http://"); Serial.println(WiFi.softAPIP());

    server.on("/", ServerManager::handleRootPage);
    server.on("/save", ServerManager::handleSavePage);

    server.begin();
}

// =========================
//  Public functions
// =========================


void ServerManager::begin() {

    randomSeed(micros());   // for password generation

    savedSSID = Storage::loadSSID();
    savedPASS = Storage::loadPASS();

    Serial.println("Saved SSID: " + savedSSID);

}

void ServerManager::connect() {

    WiFi.mode(WIFI_STA);
    if (tryConnectWiFi()) {
        wifiConfigured = true;
        Serial.println("Connected!");
        Serial.print("IP: "); Serial.println(WiFi.localIP());
    } else {
        wifiConfigured = false;
        startAPMode();
    }
}

void ServerManager::loop() {
    server.handleClient();
}

bool ServerManager::isConfigured() {
    return wifiConfigured;
}

