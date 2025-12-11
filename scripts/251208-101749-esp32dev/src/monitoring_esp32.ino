#include "display/DisplayManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "network/setup-server/ServerManager.h"
#include "sensors/MonitoringSensors.h"
#include "storage/Storage.h"
#include <Arduino.h>
#include <WiFi.h>

void setup() {
    Serial.begin(115200);
    delay(1000);

    initSensors();
    Storage::begin();
    ServerManager::begin();

    oled.clear();
    String ssid = ServerManager::getSavedSsid();
    if (ssid.length() > 0) {
        oled.printLine(0, "Connecting to:");
        oled.printLine(2, ssid);
    } else {
        oled.printLine(0, "No saved WiFi");
        oled.printLine(1, "Setup mode active");
    }
    oled.show();

    ServerManager::connect();

    // Only initialize MQTT if device is configured (connected to real WiFi)
    if (ServerManager::isConfigured()) {
        // Initialize MQTT now that WiFi is connected (uses stored server/port)
        initMQTT();

        // Request device configuration from server
        delay(1000); // Wait for MQTT connection to establish
        requestConfiguration();
    } else {
        Serial.println("Device not configured - skipping MQTT initialization");
    }
}

void loop() {
    ServerManager::loop();

    if (!ServerManager::isConfigured()) {
        Serial.println("[DEBUG] Device NOT configured - showing setup");
        String ssid = ServerManager::getSsid();
        String pass = ServerManager::getPass();
        String ip = WiFi.softAPIP().toString();

        // Print to Serial
        Serial.println("Device NOT configured!");
        Serial.print("AP SSID: ");
        Serial.println(ssid);
        Serial.print("AP PASS: ");
        Serial.println(pass);
        Serial.print("Open: http://");
        Serial.println(ip);

        // Print to OLED (use shorter text for display)
        oled.clear();
        oled.printLine(0, "ESP32-Setup");
        oled.printLine(1, "SSID: " + ssid);
        oled.printLine(2, "Pass: " + pass);
        oled.printLine(3, "IP:");
        oled.printLine(4, ip);
        oled.show();
        delay(2000);
        return;
    }

    Serial.println("[DEBUG] Device configured - normal mode");
    // WiFi configured -> normal mode
    readAllSensors();
    // Publish any pending sensor values (uses SensorStateManager configs)
    publishPendingToMQTT();
    // maintain MQTT connection
    mqttLoop();
    delay(5000);
}