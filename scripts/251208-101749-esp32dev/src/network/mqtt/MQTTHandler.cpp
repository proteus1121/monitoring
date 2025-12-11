#include "MQTTHandler.h"
#include "../../sensors/SensorState.h"
#include "../../storage/Storage.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

// Fallback defaults (used when storage is empty)
static const char *DEFAULT_MQTT_SERVER = "139.59.148.159";
static const uint16_t DEFAULT_MQTT_PORT = 1883;

WiFiClient espClient;
PubSubClient client(espClient);
static String currentServer = "";
static uint16_t currentPort = 0;

static bool isPrintableAscii(const String &s) {
    if (s.length() == 0)
        return false;
    for (size_t i = 0; i < s.length(); i++) {
        char c = s[i];
        if (c < 32 || c > 126)
            return false;
    }
    return true;
}

// MQTT callback function to handle configuration messages
void mqttCallback(char *topic, byte *payload, unsigned int length) {
    Serial.println("[MQTT CALLBACK] Called!");

    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    Serial.printf("[MQTT] Config message on %s: %s\n", topic, message.c_str());

    // Parse topic: users/<userId>/devices/<deviceId>/configuration
    String topicStr(topic);
    int firstSlash = topicStr.indexOf('/');
    int secondSlash = topicStr.indexOf('/', firstSlash + 1);
    int thirdSlash = topicStr.indexOf('/', secondSlash + 1);
    int fourthSlash = topicStr.indexOf('/', thirdSlash + 1);

    if (firstSlash == -1 || secondSlash == -1 || thirdSlash == -1) {
        Serial.println("[MQTT] Invalid topic format");
        return;
    }

    String userIdStr = topicStr.substring(firstSlash + 1, secondSlash);
    String deviceIdStr = topicStr.substring(thirdSlash + 1, fourthSlash);

    uint8_t deviceId = deviceIdStr.toInt();

    // Lookup config by deviceId
    SensorConfig *currentConfig = SensorStateManager::getConfigByDevice(deviceId);
    if (!currentConfig) {
        Serial.printf("[MQTT] No config found for deviceId %d\n", deviceId);
        return;
    }

    Serial.printf("[MQTT] Parsed - userId: %s, deviceId: %d\n", userIdStr.c_str(), deviceId);

    // Parse JSON config
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (err) {
        Serial.println("[ERROR] JSON parse failed!");
        return;
    }

    // Extract configuration with defaults (fallback to current config values or hardcoded defaults)
    uint32_t interval = doc["delay"] | (currentConfig->sendDelay);
    float maxValue = doc["criticalValue"] | (currentConfig->maxValue);
    float minValue = doc["lowerValue"] | (currentConfig->minValue);

    Serial.printf("[CONFIG] delay=%lu, maxValue=%.2f, minValue=%.2f\n",
                  interval, maxValue, minValue);

    // Update the matching device config
    SensorConfig *cfg = currentConfig;
    if (cfg) {
        cfg->sendDelay = interval;
        cfg->maxValue = maxValue;
        cfg->minValue = minValue;
        Serial.printf("[CONFIG] Updated device %d with interval=%lu, max=%.2f, min=%.2f\n",
                      deviceId, interval, maxValue, minValue);
    }

    Serial.println("[MQTT] Configuration applied");
}

void initMQTT() {
    // Read server & port from storage, fall back to defaults
    String server = Storage::loadMqttServer();
    uint16_t port = Storage::loadMqttPort();
    if (!isPrintableAscii(server) || port == 0) {
        server = String(DEFAULT_MQTT_SERVER);
        port = DEFAULT_MQTT_PORT;
        Serial.println("Using default MQTT server/port");
    } else {
        Serial.print("MQTT server from storage: ");
        Serial.print(server);
        Serial.print(":");
        Serial.println(port);
    }

    // store current server/port for reconnect logging
    currentServer = server;
    currentPort = port;

    // Try to resolve hostname to IP (if needed)
    IPAddress resolvedIP;
    if (isPrintableAscii(server) && WiFi.status() == WL_CONNECTED) {
        if (WiFi.hostByName(server.c_str(), resolvedIP)) {
            Serial.print("Resolved MQTT server ");
            Serial.print(server);
            Serial.print(" -> ");
            Serial.println(resolvedIP);
            client.setServer(resolvedIP, port);
            return;
        } else {
            Serial.print("DNS lookup failed for ");
            Serial.println(server);
        }
    }

    // Fallback: set by name (PubSubClient will attempt resolution when connecting)
    client.setServer(server.c_str(), port);

    // Set MQTT callback for incoming messages
    client.setCallback(mqttCallback);
}

void reconnectMQTT() {
    while (!client.connected()) {
        // Load credentials from storage
        String user = Storage::loadMqttUser();
        String pass = Storage::loadMqttPass();

        bool connected = false;
        if (user.length() > 0) {
            connected = client.connect("ESP32Client", user.c_str(), pass.c_str());
        } else {
            connected = client.connect("ESP32Client");
        }

        if (connected) {
            Serial.println("MQTT Connected");

            // Subscribe to configuration topics for all sensors
            String userId = Storage::loadUserId();
            if (userId.length() > 0) {
                String configTopic = "users/" + userId + "/devices/+/configuration";
                if (client.subscribe(configTopic.c_str())) {
                    client.setCallback(mqttCallback);
                    Serial.print("Subscribed to: ");
                    Serial.println(configTopic);
                } else {
                    Serial.print("Failed to subscribe to: ");
                    Serial.println(configTopic);
                }
            }
        } else {
            Serial.print("MQTT connect failed to ");
            Serial.print(currentServer);
            Serial.print(":");
            Serial.print(currentPort);
            Serial.print(" , rc=");
            Serial.println(client.state());
            delay(3000);
        }
    }
}

void mqttLoop() {
    if (!client.connected())
        reconnectMQTT();
    client.loop();
}

void publishSensorValue(uint8_t deviceId, float value) {
    if (!client.connected()) {
        reconnectMQTT();
    }

    // Get userId from storage
    String userId = Storage::loadUserId();
    if (userId.length() == 0) {
        Serial.println("ERROR: User ID not configured");
        return;
    }

    // Build topic: users/<userId>/devices/<deviceId>/measurements
    String topic = "users/" + userId + "/devices/" + String(deviceId) + "/measurements";

    // Convert value to string with 2 decimal places
    char valueStr[16];
    snprintf(valueStr, sizeof(valueStr), "%.2f", value);

    // Publish to MQTT
    if (client.publish(topic.c_str(), valueStr)) {
        Serial.print("Published to ");
        Serial.print(topic);
        Serial.print(": ");
        Serial.println(valueStr);
    } else {
        Serial.print("Failed to publish to ");
        Serial.println(topic);
    }
}

void requestConfiguration() {
    if (!client.connected()) {
        reconnectMQTT();
    }

    // Get userId from storage
    String userId = Storage::loadUserId();
    if (userId.length() == 0) {
        Serial.println("ERROR: User ID not configured, cannot request configuration");
        return;
    }

    // Build request topic: users/<userId>/configuration/request
    String requestTopic = "users/" + userId + "/configuration/request";

    // Publish configuration request
    if (client.publish(requestTopic.c_str(), "get")) {
        Serial.print("Configuration request sent to ");
        Serial.println(requestTopic);
    } else {
        Serial.print("Failed to send configuration request to ");
        Serial.println(requestTopic);
    }
}