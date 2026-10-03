#include "devices/DeviceManager.h"
#include "display/DisplayManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "network/setup-server/ServerManager.h"
#include "storage/Storage.h"
#include "system/DoubleReset.h"
#include <Arduino.h>

// include the appropriate WiFi header for each platform
#if defined(ESP8266)
#include <ESP8266WiFi.h>
#elif defined(ESP32)
#include <WiFi.h>
#else
#warning "Unknown Arduino-compatible board, please provide correct WiFi include."
#endif

//----------------------------------------------------------------------
// Sensors are NOT configured here. Wire the modules to the board, add them
// on the Devices page (controller + sensor model + GPIO) and the server sends
// the configuration over MQTT. See devices/DeviceManager.h.
//
// Setup page: press RST twice (or hold BOOT for 3 s on ESP32), join the
// ESP32-Setup / ESP8266-Setup Wi-Fi and open http://192.168.4.1. The board is
// linked to an account with a code shown on its display, no user id is typed.
//
// Only the display and the BOOT button are fixed:
//   ESP32   - SSD1306 on I2C SDA 27 / SCL 14, BOOT button GPIO0
//   ESP8266 - ST7565 over SPI on D5, D6, D2, D7, D4 (see DisplayManager.h)
//----------------------------------------------------------------------

#if defined(ESP32)
const uint8_t PIN_BOOT = 0; // BOOT button on GPIO0
#endif

static const unsigned long DISPLAY_REFRESH_MS = 1000;
static const unsigned long SETUP_INFO_INTERVAL_MS = 5000;

// BOOT button debounce and hold detection
static unsigned long bootButtonPressTime = 0;
const unsigned long BOOT_HOLD_TIME = 3000; // 3 seconds to trigger setup mode

void checkBootButton() {
#if defined(ESP32)
    bool bootPressed = (digitalRead(PIN_BOOT) == LOW);

    if (bootPressed) {
        if (bootButtonPressTime == 0) {
            bootButtonPressTime = millis();
            Serial.println("[BOOT] Button pressed - starting count");
        } else if (millis() - bootButtonPressTime >= BOOT_HOLD_TIME) {
            Serial.println("[BOOT] 3 seconds reached - ENTERING SETUP MODE!");
            bootButtonPressTime = 0;
            ServerManager::enterSetupMode();
        }
    } else {
        bootButtonPressTime = 0;
    }
#endif
}

void showSetupInfo() {
    static unsigned long lastShown = 0;
    if (lastShown != 0 && millis() - lastShown < SETUP_INFO_INTERVAL_MS)
        return;
    lastShown = millis();

    String ssid = ServerManager::getSsid();
    String pass = ServerManager::getPass();
    String ip = WiFi.softAPIP().toString();

    Serial.println("Device NOT configured!");
    Serial.println("AP SSID: " + ssid);
    Serial.println("AP PASS: " + pass);
    Serial.println("Open: http://" + ip);
    Serial.println("Hardware ID: " + hardwareId());

    oled.clear();
    oled.printLine(0, "Setup mode");
    oled.printLine(1, "SSID: " + ssid);
    oled.printLine(2, "Pass: " + pass);
    oled.printLine(3, "http://" + ip);
    oled.show();
}

void setup() {
    // first thing: a second RST press during the display splash must still be seen
    bool openSetup = DoubleReset::detect();
    Serial.begin(115200);
    delay(500);
    Serial.println();
    Serial.println("Monitoring firmware " FIRMWARE_VERSION);

#if defined(ESP32)
    pinMode(PIN_BOOT, INPUT_PULLUP);
#endif

    oled.begin();
    Serial.println(oled.isInitialized() ? "[SETUP] Display initialized" : "[SETUP] Display not found");

    Storage::begin();
    ServerManager::begin();
    Serial.println("Hardware ID: " + hardwareId());
    Serial.println("User ID: " + Storage::loadUserId());

    oled.clear();
    String ssid = ServerManager::getSavedSsid();
    if (ssid.length() > 0) {
        oled.printLine(0, "Connecting to:");
        oled.printLine(1, ssid);
    } else {
        oled.printLine(0, "No saved WiFi");
        oled.printLine(1, "Setup mode active");
    }
    oled.printLine(3, hardwareId());
    oled.show();

    if (openSetup) {
        // double RST press: settings page even when Wi-Fi works
        ServerManager::enterSetupMode();
        return;
    }

    ServerManager::connect();

    if (ServerManager::isConfigured()) {
        initMQTT();
        if (isPairing()) {
            // keep the access point so the setup page can show the pairing code
            ServerManager::startPairingPortal();
        }
    } else {
        Serial.println("Device not configured - skipping MQTT initialization");
    }
}

void loop() {
    DoubleReset::loop();
    checkBootButton();
    ServerManager::loop();

    if (!ServerManager::isConfigured()) {
        showSetupInfo();
        delay(50);
        return;
    }

    mqttLoop();
    DeviceManager::loop();

    static unsigned long lastRender = 0;
    if (millis() - lastRender >= DISPLAY_REFRESH_MS) {
        lastRender = millis();
        DeviceManager::render();
    }

    delay(10);
}
