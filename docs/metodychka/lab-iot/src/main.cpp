// src/main.cpp
#include <Arduino.h>
#include <Wire.h>
#include <DHTesp.h>
#include <Adafruit_BMP085.h>
#include <U8g2lib.h>
#include "config.h"

void networkSetup();
void networkLoop();
void publish(const char *name, float value);

DHTesp dht;
Adafruit_BMP085 bmp;
bool bmpOk = false;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE, 22, 21);

struct Readings {
    float t = NAN, rh = NAN, p = NAN, gasV = NAN, soil = NAN;
} r;

bool lastFlame = false, lastMotion = false, lastButton = HIGH;
unsigned long lastSample = 0, lastPublish = 0, lastButtonChange = 0;

float averageMv(uint8_t pin) {
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) sum += analogReadMilliVolts(pin);
    return sum / 16.0;
}

void sample() {
    TempAndHumidity d = dht.getTempAndHumidity();
    if (dht.getStatus() == DHTesp::ERROR_NONE) { r.t = d.temperature; r.rh = d.humidity; }
    if (bmpOk) r.p = bmp.readPressure() / 100.0;
    r.gasV = averageMv(PIN_MQ2) / 1000.0 * 1.5;                 // дільник 10/20 кОм
    float raw = averageMv(PIN_SOIL) / 3300.0 * 4095.0;
    r.soil = constrain((2800 - raw) * 100.0 / (2800 - 1250), 0.0, 100.0);
}

void draw() {
    char line[24];
    oled.clearBuffer();
    oled.setFont(u8g2_font_6x10_tf);
    snprintf(line, sizeof(line), "T %.1f C  RH %.0f %%", r.t, r.rh); oled.drawStr(0, 12, line);
    snprintf(line, sizeof(line), "p %.1f hPa", r.p);                 oled.drawStr(0, 26, line);
    snprintf(line, sizeof(line), "MQ-2 %.2f V", r.gasV);             oled.drawStr(0, 40, line);
    snprintf(line, sizeof(line), "Soil %.0f %%", r.soil);            oled.drawStr(0, 54, line);
    oled.sendBuffer();
}

void checkEvents() {
    bool flame = digitalRead(PIN_FLAME) == LOW;                 // активний LOW
    bool motion = digitalRead(PIN_PIR) == HIGH;                 // активний HIGH
    if (flame != lastFlame) { lastFlame = flame; publish("flame", flame); }
    if (motion != lastMotion) { lastMotion = motion; publish("motion", motion); }
    digitalWrite(PIN_LED, flame ? HIGH : LOW);                  // місцева сигналізація
}

void setup() {
    Serial.begin(115200);
    pinMode(PIN_LED, OUTPUT);
    pinMode(PIN_RELAY, OUTPUT);
    pinMode(PIN_BUTTON, INPUT_PULLUP);
    pinMode(PIN_FLAME, INPUT);
    pinMode(PIN_PIR, INPUT);
    dht.setup(PIN_DHT, DHTesp::DHT22);
    Wire.begin(21, 22);
    bmpOk = bmp.begin();
    oled.begin();
    networkSetup();
}

void loop() {
    networkLoop();
    checkEvents();
    bool button = digitalRead(PIN_BUTTON);
    if (button != lastButton && millis() - lastButtonChange >= 50) {   // зміни за 50 мс – брязкіт
        lastButtonChange = millis();
        lastButton = button;
        if (button == LOW) {                                    // натиснення перемикає реле
            digitalWrite(PIN_RELAY, !digitalRead(PIN_RELAY));
            publish("relay", digitalRead(PIN_RELAY));
        }
    }
    if (millis() - lastSample >= 2000) {
        lastSample = millis();
        sample();
        draw();
        Serial.printf("T=%.1f RH=%.0f p=%.1f gas=%.2fV soil=%.0f%%\n", r.t, r.rh, r.p, r.gasV, r.soil);
    }
    if (millis() - lastPublish >= PUBLISH_INTERVAL_MS) {
        lastPublish = millis();
        publish("temperature", r.t);
        publish("humidity", r.rh);
        publish("pressure", r.p);
        publish("gas_voltage", r.gasV);
        publish("soil", r.soil);
    }
}
