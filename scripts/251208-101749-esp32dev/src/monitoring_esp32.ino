#include "display/DisplayManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "network/setup-server/ServerManager.h"
#include "sensors/MonitoringSensors.h"
#include "storage/Storage.h"
#include <Arduino.h>

// include the appropriate WiFi header for each platform
#if defined(ESP8266)
#include <ESP8266WiFi.h>
// U8g2 display library is used only on the esp8266 variant; DisplayManager
// already pulls this in when ESP8266 is detected, but including here makes
// the macros available for the sketch as well.
#include <U8g2lib.h>
#elif defined(ESP32)
#include <WiFi.h>
#else
#warning "Unknown Arduino-compatible board, please provide correct WiFi include."
#endif

//----------------------------------------------------------------------
// sensor pin configuration
// the sketch passes these values into initSensors(); the defaults
// defined in MonitoringSensors.h are used when the constants below are
// omitted.
//----------------------------------------------------------------------

#ifdef USE_U8G2
// Example: the U8g2 display library is wrapped by DisplayManager, but the
// underlying object remains accessible if you need finer control.  the
// DisplayManager::begin() call already performs the basic initialization and
// shows a splash screen.  you can then grab the pointer and use the same
// methods from your earlier snippet:
//
//   U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *u8g2 = oled.getU8g2();
//   if (u8g2) {
//       u8g2->clearBuffer();
//       u8g2->setFont(u8g2_font_guildenstern_nbp_t_all);
//       u8g2->drawStr(10, 20, "Env Monitor v2.0");
//       u8g2->drawStr(10, 40, "Initializing...");
//       u8g2->sendBuffer();
//   }
//
// A more comprehensive update function (with temperature/humidity etc.) can
// be written exactly as in your provided snippet – just refer to 'oled' to
// obtain the u8g2 pointer.
#endif

#if defined(ESP32)
const uint8_t PIN_DHT = 26;
const uint8_t PIN_MQ2 = 35;
const uint8_t PIN_LIGHT = 32;
const uint8_t PIN_IR = 33;
const uint8_t PIN_PIR = 13;
const uint8_t I2C_SDA = 14;
const uint8_t I2C_SCL = 27;
#elif defined(ESP8266)
// dht, mq2, light and ir sensors only; PIR and i2c peripherals are omitted
// entirely.  if you add them later just define PIN_PIR, I2C_SDA/I2C_SCL here.
const uint8_t PIN_DHT = D0;
const uint8_t PIN_MQ2 = A0;
const uint8_t PIN_LIGHT = D8;
const uint8_t PIN_IR = D1;
const uint8_t PIN_PIR = NO_PIN;
const uint8_t I2C_SDA = NO_PIN;
const uint8_t I2C_SCL = NO_PIN;

// U8g2 SPI pin definitions (match the snippet); users may override if
// using different wiring.
#define U8G2_CLK_PIN D5
#define U8G2_DATA_PIN D6
#define U8G2_CS_PIN D2
#define U8G2_DC_PIN D7
#define U8G2_RST_PIN D4
#else
#warning "No default pin assignments defined for this board. You must supply values manually."
#endif

void setup() {
    Serial.begin(115200);
    delay(1000);

    // provide pin assignments for the sensors (allows ESP32/8266 support and
    // easy reconfiguration from the sketch).  The pin constants defined above
    // are used directly.
    uint8_t pinDht = PIN_DHT;
    uint8_t pinMq2 = PIN_MQ2;
    uint8_t pinLight = PIN_LIGHT;
    uint8_t pinIr = PIN_IR;
    uint8_t pinPir = PIN_PIR;
    uint8_t i2cSda = I2C_SDA;
    uint8_t i2cScl = I2C_SCL;

    initSensors(pinDht, pinMq2, pinLight, pinIr, pinPir, i2cSda, i2cScl);

    // Report display status
    if (oled.isInitialized()) {
        Serial.println("[SETUP] Display initialized successfully");
    } else {
        Serial.println("[SETUP] WARNING: Display failed to initialize - check I2C address and wiring");
    }

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
    Serial.flush(); // ensure output buffer is written before sensor reading
    // WiFi configured -> normal mode
    Serial.println("[DEBUG] About to call readAllSensors()");
    Serial.flush();
    readAllSensors();
    Serial.println("[DEBUG] readAllSensors() returned");
    Serial.flush();
    // Publish any pending sensor values (uses SensorStateManager configs)
    publishPendingToMQTT();
    // maintain MQTT connection
    mqttLoop();
    delay(5000);
}