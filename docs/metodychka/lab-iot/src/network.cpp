// src/network.cpp
#include <WiFi.h>              // для ESP8266: <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "config.h"

WiFiClient net;
PubSubClient mqtt(net);
unsigned long lastAttempt = 0;

// без String: порівнюємо байти, інші значення команди ігноруємо
void onMessage(char *topic, byte *payload, unsigned int len) {
    if (strcmp(topic, TOPIC_PREFIX "relay/set") != 0 || len != 1) return;
    if (payload[0] == '1') digitalWrite(PIN_RELAY, HIGH);
    else if (payload[0] == '0') digitalWrite(PIN_RELAY, LOW);
}

void networkSetup() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);           // підключення йде у фоні
    mqtt.setServer(MQTT_HOST, MQTT_PORT);
    mqtt.setCallback(onMessage);
}

void networkLoop() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (!mqtt.connected()) {
        if (millis() - lastAttempt < 5000) return;
        lastAttempt = millis();
        String clientId = "lab-" + WiFi.macAddress();
        if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
            mqtt.subscribe(TOPIC_PREFIX "relay/set");
            Serial.println("MQTT connected");
        } else {
            Serial.printf("MQTT failed, state %d\n", mqtt.state());
            return;
        }
    }
    mqtt.loop();                                 // прийом повідомлень і keep-alive
}

void publish(const char *name, float value) {
    char topic[96], payload[16];
    snprintf(topic, sizeof(topic), "%s%s", TOPIC_PREFIX, name);
    snprintf(payload, sizeof(payload), "%.2f", value);
    // QoS 0, без retain; без з'єднання показ втрачається – буферизації в практикумі немає
    if (mqtt.connected()) mqtt.publish(topic, payload, false);
}
