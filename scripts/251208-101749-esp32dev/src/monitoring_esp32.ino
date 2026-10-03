#include "devices/DeviceManager.h"
#include "display/DisplayManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "network/setup-server/ServerManager.h"
#include "storage/Storage.h"
#include "system/Ota.h"
#include "system/Scanner.h"
#include "display/Screens.h"
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
// Setup page: hold BOOT / FLASH for 3 s (a short press flips pages, or leaves the setup page); join the
// ESP32-Setup / ESP8266-Setup Wi-Fi and open http://192.168.4.1. The board is
// linked to an account with a code shown on its display, no user id is typed.
//
// Only the BOOT / FLASH button on GPIO0 is fixed. The display is configured on the site as well
// (ST7565 SPI, SSD1306 / SH1106 I2C) and saved to flash; until then the board uses the one it shipped with:
//   ESP32   - SSD1306 on I2C SDA 27 / SCL 14
//   ESP8266 - ST7565 over SPI on D5, D6, D2, D7, D4
//----------------------------------------------------------------------

// BOOT (ESP32) / FLASH (ESP8266 NodeMCU) button, GPIO0 on both. Only read after boot, when the pin is a
// plain input: pressed at power-on it selects the flashing mode instead.
const uint8_t PIN_BOOT = 0;

static const unsigned long DISPLAY_REFRESH_MS = 1000;
static const unsigned long SETUP_INFO_INTERVAL_MS = 5000;

// Short press: next page of readings, or back to work from the setup page. Holding it 3 s opens the setup
// page (a double press would clash with flipping pages quickly).
const unsigned long BOOT_HOLD_TIME = 3000;
const unsigned long DEBOUNCE_MS = 30;

void checkBootButton() {
    static bool pressed = false;
    static unsigned long changedAt = 0;
    static unsigned long pressedAt = 0;

    bool down = digitalRead(PIN_BOOT) == LOW;
    unsigned long now = millis();
    if (down != pressed) {
        if (now - changedAt < DEBOUNCE_MS)
            return;
        changedAt = now;
        pressed = down;
        if (down) {
            pressedAt = now;
        } else if (pressedAt != 0) {
            pressedAt = 0;
            if (!ServerManager::isConfigured() && ServerManager::getSavedSsid().length() > 0) {
                // setup page opened by mistake: restart to connect to the saved Wi-Fi again
                Serial.println("[BOOT] Short press - leaving setup mode");
                delay(100);
                ESP.restart();
                return;
            }
            Serial.println("[BOOT] Short press - next page");
            Screens::nextPage();
            if (ServerManager::isConfigured())
                DeviceManager::render();
        }
        return;
    }
    if (pressed && pressedAt != 0 && now - pressedAt >= BOOT_HOLD_TIME) {
        Serial.println("[BOOT] Held for 3 s - entering setup mode");
        // the release after a hold is not a page flip
        pressedAt = 0;
        ServerManager::enterSetupMode();
    }
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

    Screens::setupMode(ssid, pass, ip);
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println();
    Serial.println("Monitoring firmware " FIRMWARE_VERSION);

    pinMode(PIN_BOOT, INPUT_PULLUP);

    Storage::begin();
    DisplayConfig display = DisplayConfig::defaultFor();
    if (!Storage::loadDisplay(display)) {
        Serial.println("[SETUP] No display saved, using the default one");
    }
    oled.begin(display);
    Screens::splash(FIRMWARE_VERSION);

    ServerManager::begin();
    Serial.println("Hardware ID: " + hardwareId());
    Serial.println("User ID: " + Storage::loadUserId());

    Screens::connecting(ServerManager::getSavedSsid());

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
    Ota::loop();
    if (Ota::inProgress()) {
        // nothing else while the new firmware is written
        return;
    }
    checkBootButton();
    ServerManager::loop();

    if (!ServerManager::isConfigured()) {
        showSetupInfo();
        delay(50);
        return;
    }

    mqttLoop();
    if (DeviceManager::restartRequested()) {
        delay(200);
        ESP.restart();
    }
    Scanner::loop();
    DeviceManager::loop();

    static unsigned long lastRender = 0;
    if (millis() - lastRender >= DISPLAY_REFRESH_MS) {
        lastRender = millis();
        DeviceManager::render();
    }

    delay(10);
}
