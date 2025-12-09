#include <Arduino.h>
#include "network/mqtt/MQTTHandler.h"
#include "sensors/MonitoringSensors.h"
#include "network/setup-server/ServerManager.h"
#include "display/DisplayManager.h"
#include "storage/Storage.h"
#include <WiFi.h>

void setup()
{
    Serial.begin(115200);
    delay(1000);

    // initWiFi();
    // initMQTT();
    initSensors();
    Storage::begin();
    ServerManager::begin();

    oled.clear();
    oled.printLine(0, "Connecting to the ");
    oled.printLine(2, ServerManager::getSavedSsid());
    oled.show();

    ServerManager::connect();

}

void loop()
{
    ServerManager::loop();

    if (!ServerManager::isConfigured())
    {
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

        // Print to OLED
        oled.clear();
        oled.printLine(0, "Device NOT configured");
        oled.printLine(2, "AP: " + ssid);
        oled.printLine(3, "PASS: " + pass);
        oled.printLine(4, "IP: " + ip);

        oled.show();
        delay(2000);
        return;
    }

    // WiFi configured -> normal mode
    readAllSensors();
    // mqttLoop(); // maintain MQTT connection
    delay(5000);
}