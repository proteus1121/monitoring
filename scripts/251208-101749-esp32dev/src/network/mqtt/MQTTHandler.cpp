#include "MQTTHandler.h"
#include "../../devices/DeviceManager.h"
#include "../../display/DisplayManager.h"
#include "../../system/Scanner.h"
#include "../../system/FirmwareUpdate.h"
#include "../../storage/Storage.h"
#include "network/setup-server/ServerManager.h" // needed for AP fallback
#include <ArduinoJson.h>
#include <PubSubClient.h>
#if defined(ESP8266)
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif

// Fallback defaults (used when storage is empty)
static const char *DEFAULT_MQTT_SERVER = "139.59.148.159";
static const uint16_t DEFAULT_MQTT_PORT = 1883;

// configuration of all devices has to fit into one MQTT packet
static const uint16_t MQTT_BUFFER_SIZE = 4096;
static const unsigned long RECONNECT_INTERVAL_MS = 5000;
static const unsigned long HELLO_INTERVAL_MS = 60000;
// consecutive failed connects (with WiFi up) before falling back to the setup portal
static const int MAX_MQTT_FAILURES = 12;

WiFiClient espClient;
PubSubClient client(espClient);
static String currentServer = "";
static uint16_t currentPort = 0;
static String userId = "";
static String configTopic = "";
static String commandTopicPrefix = "";
static String scanTopic = "";
static String updateTopic = "";
static unsigned long lastReconnectAttempt = 0;
static unsigned long lastHello = 0;
static bool helloPending = false;
static int failures = 0;

// a board gets an account and its own MQTT login by "Sign in" on its page (ServerManager); until then it does
// not connect at all, the broker has no anonymous access
static bool linked = false;
static bool restartPending = false;

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

const String &hardwareId() {
    static String id = "";
    if (id.length() == 0) {
#if defined(ESP8266)
        id = "esp8266-" + String(ESP.getChipId(), HEX);
#else
        uint64_t mac = ESP.getEfuseMac();
        char buf[13];
        snprintf(buf, sizeof(buf), "%04x%08x", (uint16_t)(mac >> 32), (uint32_t)mac);
        id = "esp32-" + String(buf);
#endif
    }
    return id;
}

static void publishHello() {
    JsonDocument doc;
#if defined(ESP8266)
    doc["platform"] = "esp8266";
#else
    doc["platform"] = "esp32";
#endif
    doc["board"] = BOARD_ID;
    doc["fw"] = FIRMWARE_VERSION;
    doc["ip"] = WiFi.localIP().toString();
    doc["v"] = DeviceManager::configVersion();
    // the site warns when the configured display does not answer
    doc["disp"] = oled.config().model == DisplayConfig::NONE || oled.isInitialized();

    String payload;
    serializeJson(doc, payload);
    String topic = "users/" + userId + "/controllers/" + hardwareId() + "/hello";
    if (client.publish(topic.c_str(), payload.c_str())) {
        Serial.println("[MQTT] Hello -> " + topic + " " + payload);
        lastHello = millis();
        helloPending = false;
    }
}

static void mqttCallback(char *topic, byte *payload, unsigned int length) {
    String topicStr(topic);
    Serial.printf("[MQTT] Message on %s (%u bytes)\n", topic, length);

    if (topicStr == configTopic) {
        // the board was deleted on the site (its login is revoked too): forget the account, link again
        if (length > 0 && length < 64) {
            JsonDocument doc;
            if (!deserializeJson(doc, (const char *)payload, length) && (doc["unpair"] | false)) {
                Serial.println("[LINK] Board removed from the account, restarting to link it again");
                forgetAccount();
                restartPending = true;
                return;
            }
        }
        String before = DeviceManager::configVersion();
        // only report a new version: answering repeats of the same configuration makes the server
        // and the board echo each other when several changes are published in a row
        if (DeviceManager::applyConfiguration(payload, length) && DeviceManager::configVersion() != before) {
            // publishing from inside the callback would overwrite the buffer `payload` points to,
            // so the hello is sent from mqttLoop()
            helloPending = true;
        }
        return;
    }

    if (topicStr == updateTopic) {
        JsonDocument doc;
        if (deserializeJson(doc, (const char *)payload, length)) {
            Serial.println("[UPDATE] Bad request");
            return;
        }
        FirmwareUpdate::request(doc["url"] | "", doc["md5"] | "", doc["version"] | "");
        return;
    }

    if (topicStr == scanTopic) {
        JsonDocument doc;
        String id;
        if (!deserializeJson(doc, (const char *)payload, length))
            id = doc["id"] | "";
        Serial.println("[SCAN] Requested from the site");
        Scanner::request(id);
        return;
    }

    // users/<userId>/devices/<deviceId>/command
    if (topicStr.startsWith(commandTopicPrefix) && topicStr.endsWith("/command")) {
        String idStr = topicStr.substring(commandTopicPrefix.length(), topicStr.length() - strlen("/command"));
        uint32_t deviceId = strtoul(idStr.c_str(), nullptr, 10);
        if (deviceId == 0 || length == 0)
            return;
        char buf[16];
        size_t n = min((size_t)length, sizeof(buf) - 1);
        memcpy(buf, payload, n);
        buf[n] = 0;
        float value = atof(buf);
        Serial.printf("[MQTT] Command for device %lu: %.2f\n", (unsigned long)deviceId, value);
        DeviceManager::handleCommand(deviceId, value);
    }
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

    currentServer = server;
    currentPort = port;

    userId = Storage::loadUserId();
    userId.trim();
    // erased EEPROM reads as garbage on ESP8266
    if (!isPrintableAscii(userId)) {
        userId = "";
    }
    linked = userId.length() > 0 && Storage::loadMqttUser().length() > 0;
    if (!linked) {
        Serial.println("[LINK] The board has no account yet: open its page and press Sign in");
    }
    configTopic = "users/" + userId + "/controllers/" + hardwareId() + "/configuration";
    commandTopicPrefix = "users/" + userId + "/devices/";
    scanTopic = "users/" + userId + "/controllers/" + hardwareId() + "/scan";
    updateTopic = "users/" + userId + "/controllers/" + hardwareId() + "/update";

    Serial.println("Hardware ID: " + hardwareId());

    client.setBufferSize(MQTT_BUFFER_SIZE);
    client.setKeepAlive(30);
    client.setCallback(mqttCallback);

    IPAddress resolvedIP;
    if (WiFi.hostByName(server.c_str(), resolvedIP)) {
        Serial.print("Resolved MQTT server ");
        Serial.print(server);
        Serial.print(" -> ");
        Serial.println(resolvedIP);
        client.setServer(resolvedIP, port);
    } else {
        Serial.print("DNS lookup failed for ");
        Serial.println(server);
        client.setServer(currentServer.c_str(), port);
    }
}

static bool connectMQTT() {
    String user = Storage::loadMqttUser();
    String pass = Storage::loadMqttPass();
    String clientId = hardwareId();

    if (!client.connect(clientId.c_str(), user.c_str(), pass.c_str())) {
        Serial.printf("[MQTT] Connect to %s:%u failed, rc=%d\n", currentServer.c_str(), currentPort, client.state());
        return false;
    }

    Serial.println("[MQTT] Connected as " + clientId);

    // retained configuration and commands are delivered right after subscribing
    bool ok = client.subscribe(configTopic.c_str(), 1);
    String commandTopic = commandTopicPrefix + "+/command";
    ok = client.subscribe(commandTopic.c_str(), 1) && ok;
    ok = client.subscribe(scanTopic.c_str(), 0) && ok;
    ok = client.subscribe(updateTopic.c_str(), 0) && ok;
    Serial.println(String("[MQTT] Subscribed to ") + configTopic + " and " + commandTopic + (ok ? "" : " (FAILED)"));

    publishHello();
    return true;
}

void mqttLoop() {
    if (!linked)
        return;
    if (!client.connected()) {
        unsigned long now = millis();
        if (lastReconnectAttempt != 0 && now - lastReconnectAttempt < RECONNECT_INTERVAL_MS)
            return;
        lastReconnectAttempt = now;

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[MQTT] Waiting for WiFi");
            return;
        }

        if (connectMQTT()) {
            failures = 0;
        } else if (++failures >= MAX_MQTT_FAILURES) {
            Serial.println("[MQTT] too many connection failures, entering setup mode");
            failures = 0;
            // let the user fix server / credentials
            ServerManager::enterSetupMode();
        }
        return;
    }

    client.loop();

    if (restartPending) {
        client.disconnect();
        delay(300);
        ESP.restart();
    }

    if (helloPending || millis() - lastHello >= HELLO_INTERVAL_MS) {
        publishHello();
    }
}

bool mqttConnected() {
    return client.connected();
}

bool isLinked() {
    return linked;
}

void forgetAccount() {
    Storage::saveUserId("");
    Storage::saveMqttUser("");
    Storage::saveMqttPass("");
    Storage::sync();
}

bool publishUpdateStatus(const String &payload) {
    if (!client.connected())
        return false;
    String topic = "users/" + userId + "/controllers/" + hardwareId() + "/update-status";
    return client.publish(topic.c_str(), payload.c_str());
}

bool publishScanResult(const String &payload) {
    if (!client.connected())
        return false;
    String topic = "users/" + userId + "/controllers/" + hardwareId() + "/scan-result";
    bool ok = client.publish(topic.c_str(), payload.c_str());
    if (!ok)
        Serial.println("[SCAN] Failed to publish the result");
    return ok;
}

bool publishMeasurement(uint32_t deviceId, float value) {
    if (!client.connected() || userId.length() == 0)
        return false;

    String topic = commandTopicPrefix + String(deviceId) + "/measurements";
    char valueStr[16];
    snprintf(valueStr, sizeof(valueStr), "%.2f", value);

    if (client.publish(topic.c_str(), valueStr)) {
        Serial.printf("[MQTT] %s = %s\n", topic.c_str(), valueStr);
        return true;
    }
    Serial.printf("[MQTT] Failed to publish %s\n", topic.c_str());
    return false;
}
