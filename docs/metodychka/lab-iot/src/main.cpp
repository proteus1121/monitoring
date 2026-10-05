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

// вимірювальні та подієві датчики; новий датчик = новий об'єкт драйвера і рядок у масиві.
// Кнопка, реле і світлодіод HL1 обробляються окремо.
ISensor *sensors[] = {&temperature, &humidity, &pressure, &gas, &soil, &flame, &motion};
const size_t SENSOR_COUNT = sizeof(sensors) / sizeof(sensors[0]);
float lastEvent[SENSOR_COUNT];                            // останнє опубліковане значення події
bool eventSent[SENSOR_COUNT] = {};                        // чи публікували подію хоч раз

U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);

bool lastButton = HIGH;
unsigned long lastSample = 0, lastPublish = 0, lastButtonChange = 0;

// періодичні покази – на дисплей і в монітор порту: «T  23.5 C»
void showReadings() {
    char line[24];
    int y = 10;
    oled.clearBuffer();
    oled.setFont(u8g2_font_6x10_tf);
    for (ISensor *s : sensors) {
        float v;
        if (s->isEventDriven()) continue;
        if (s->read(v)) snprintf(line, sizeof(line), "%-5s %8.1f %s", s->label(), v, s->unit());
        else snprintf(line, sizeof(line), "%-5s      ---", s->label());
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
        if (!sensors[i]->isEventDriven() || !sensors[i]->read(v)) continue;
        if (!eventSent[i] || v != lastEvent[i]) {               // перший стан або зміна
            eventSent[i] = true;
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
    for (ISensor *s : sensors) s->init();
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
