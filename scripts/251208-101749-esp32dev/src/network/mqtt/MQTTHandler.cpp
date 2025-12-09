#include <PubSubClient.h>
#include <WiFi.h>
#include "MQTTHandler.h"


#define MQTT_SERVER "139.59.148.159"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""


WiFiClient espClient;
PubSubClient client(espClient);


void initMQTT() {
client.setServer(MQTT_SERVER, MQTT_PORT);
}


void reconnectMQTT() {
while (!client.connected()) {
if (client.connect("ESP32Client", MQTT_USER, MQTT_PASS)) {
Serial.println("MQTT Connected");
} else {
delay(3000);
}
}
}


void mqttLoop() {
if (!client.connected()) reconnectMQTT();
client.loop();
}