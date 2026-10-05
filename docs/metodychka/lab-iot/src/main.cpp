// src/main.cpp
#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>
#include "config.h"
#include "sensors.h"

void networkSetup();
void networkLoop();
void publish(const char *name, float value);

DhtReader dht;
DhtChannel temperature(dht, false), humidity(dht, true);
BmpSensor pressure;
Mq2Sensor gas;
SoilSensor soil;
DigitalEvent flame("flame", PIN_FLAME, true);             // активний LOW
DigitalEvent motion("motion", PIN_PIR, false);            // активний HIGH

// новий модуль = новий об'єкт драйвера і рядок у цьому масиві
ISensor *sensors[] = {&temperature, &humidity, &pressure, &gas, &soil, &flame, &motion};
const size_t SENSOR_COUNT = sizeof(sensors) / sizeof(sensors[0]);
float lastEvent[SENSOR_COUNT];                            // останнє опубліковане значення події

U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);

bool lastButton = HIGH;
unsigned long lastSample = 0, lastPublish = 0, lastButtonChange = 0;

// періодичні покази – на дисплей і в монітор порту, по рядку на драйвер
void showReadings() {
    char line[24];
    int y = 10;
    oled.clearBuffer();
    oled.setFont(u8g2_font_6x10_tf);
    for (ISensor *s : sensors) {
        float v;
        if (s->isEventDriven()) continue;
        if (s->read(v)) snprintf(line, sizeof(line), "%-11s %8.2f", s->name(), v);
        else snprintf(line, sizeof(line), "%-11s      ---", s->name());
        oled.drawStr(0, y, line);
        Serial.println(line);
        y += 12;
    }
    oled.sendBuffer();
}

void publishPeriodic() {
    for (ISensor *s : sensors) {
        float v;
        if (!s->isEventDriven() && s->read(v)) publish(s->name(), v);
    }
}

void publishEvents() {
    for (size_t i = 0; i < SENSOR_COUNT; i++) {
        float v;
        if (sensors[i]->isEventDriven() && sensors[i]->read(v) && v != lastEvent[i]) {
            lastEvent[i] = v;
            publish(sensors[i]->name(), v);
        }
    }
}

void handleButton() {
    bool button = digitalRead(PIN_BUTTON);
    if (button != lastButton && millis() - lastButtonChange >= 50) {   // зміни за 50 мс – брязкіт
        lastButtonChange = millis();
        lastButton = button;
        if (button == LOW) {                                    // натиснення перемикає реле
            digitalWrite(PIN_RELAY, !digitalRead(PIN_RELAY));
            publish("relay", digitalRead(PIN_RELAY));
        }
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(PIN_LED, OUTPUT);
    pinMode(PIN_RELAY, OUTPUT);
    pinMode(PIN_BUTTON, INPUT_PULLUP);
    Wire.begin(PIN_SDA, PIN_SCL);
    for (size_t i = 0; i < SENSOR_COUNT; i++) {
        sensors[i]->init();
        lastEvent[i] = NAN;                                     // перший стан теж публікується
    }
    oled.begin();
    networkSetup();
}

void loop() {
    networkLoop();
    for (ISensor *s : sensors) s->update();
    publishEvents();
    float fire = 0;
    flame.read(fire);
    digitalWrite(PIN_LED, fire ? HIGH : LOW);                   // місцева сигналізація
    handleButton();
    if (millis() - lastSample >= 2000) {
        lastSample = millis();
        showReadings();
    }
    if (millis() - lastPublish >= PUBLISH_INTERVAL_MS) {
        lastPublish = millis();
        publishPeriodic();
    }
}
