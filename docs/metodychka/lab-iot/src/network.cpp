// src/network.cpp
#include <WiFi.h>              // для ESP8266: <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "config.h"

WiFiClient net;
PubSubClient mqtt(net);
unsigned long lastAttempt = 0;

void onMessage(char *topic, byte *payload, unsigned int len) {
    String value((char *)payload, len);
    if (String(topic) == TOPIC_PREFIX "relay/set") {
        digitalWrite(PIN_RELAY, value == "1" ? HIGH : LOW);
    }
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
    if (mqtt.connected()) mqtt.publish(topic, payload);
}
