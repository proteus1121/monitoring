#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <DHT11.h>
#include <TroykaMQ.h>
#include <EEPROM.h>

// ========================= CONFIG =========================
#define EEPROM_SIZE 512
#define CONFIG_START_ADDR 0

#define WIFI_SSID ""
#define WIFI_PASS ""

#define MQTT_SERVER "139.59.148.159"
#define MQTT_PORT   1883
#define MQTT_USER   ""
#define MQTT_PASS   ""

// Pins
#define PIN_MQ2    A0
#define PIN_DHT    D0
#define PIN_FLAME  D1
#define PIN_LIGHT  D8

// WiFi Static Config
IPAddress ip(192,168,1,50);
IPAddress gw(192,168,1,1);
IPAddress sn(255,255,255,0);
IPAddress dns(192,168,1,1);

String userId = "1";        // <--- configurable user ID

// ========================= DEVICE CONFIG STRUCT =========================
struct DeviceConfig {
  unsigned long interval;
  float critical;
};

DeviceConfig configs[8]; // 1-indexed for simplicity
const int NUM_DEVICES = sizeof(configs) / sizeof(configs[0]);

void initDefaultConfigs() {
  configs[1] = {600000, 25.0};   // Temperature
  configs[2] = {600000, 85.0};   // Humidity
  configs[3] = {900000, 1000.0}; // LPG
  configs[4] = {900000, 1000.0}; // CH4
  configs[5] = {900000, 1000.0}; // Smoke
  configs[6] = {300000, 1.0};    // Flame
  configs[7] = {300000, 2.0};    // Light
}

// ========================= OBJECTS =========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
MQ2 mq2(PIN_MQ2);
DHT11 dht11(PIN_DHT);
U8G2_ST7565_NHD_C12864_F_4W_SW_SPI u8g2(U8G2_R2, D5, D6, D2, D7, D4);

// ========================= STATE =========================
unsigned long lastSend[NUM_DEVICES + 1] = {0};
int temperature = 0;
int humidity = 0;
float lpg = 0;
float methane = 0;
float smoke = 0;
bool flameDetected = false;
bool lightDetected = false;
bool isCritical[NUM_DEVICES + 1] = {false};

String devicePrefix;        // "users/<userId>/devices/"

// ========================= FUNCTION DECLARATIONS =========================
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void readSensors();
void publishMeasurement(const char* topic, const char* payload);
void publishSensorIfDue();
void applyConfig(int deviceId, unsigned long interval, float critical);
void displayStartup();
void updateDisplay();
String buildTopic(int deviceId, const char* suffix);
void saveConfigsToEEPROM();
void loadConfigsFromEEPROM();

// ========================= SETUP =========================
void setup() {
  Serial.begin(9600);
  u8g2.begin();
  u8g2.setContrast(200);
  u8g2.enableUTF8Print();
  displayStartup();

  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_LIGHT, INPUT);
  mq2.calibrate();

  loadConfigsFromEEPROM();
  WiFi.config(ip, gw, sn, dns);
  connectWiFi();

  // Build topic prefix
  devicePrefix = "users/" + userId + "/devices/";

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

// ========================= LOOP =========================
void loop() {
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();

  readSensors();
  updateDisplay();
  publishSensorIfDue();
  delay(6000);
}

// ========================= WIFI =========================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected!");
}

// ========================= MQTT =========================
String buildTopic(int deviceId, const char* suffix) {
  return devicePrefix + String(deviceId) + "/" + suffix;
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting...");
    if (mqttClient.connect("ESP8266Client", MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");

      // Subscribe to all device configuration topics
      for (int i = 1; i < NUM_DEVICES; i++) {
        String topic = buildTopic(i, "configuration");
        mqttClient.subscribe(topic.c_str());
        Serial.printf("[MQTT] Subscribed to %s\n", topic.c_str());
      }

    } else {
      Serial.printf("failed (rc=%d). Retry in 5s.\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ========================= CALLBACK =========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];

  Serial.printf("[MQTT] Config message on %s: %s\n", topic, message.c_str());

  // Extract userId and deviceId from topic
  int uid = 0, deviceId = 0;
  if (sscanf(topic, "users/%d/devices/%d/configuration", &uid, &deviceId) != 2) {
    Serial.println("[MQTT] Invalid topic format");
    return;
  }

  if (deviceId < 1 || deviceId >= NUM_DEVICES) return;

  // Parse JSON config
  StaticJsonDocument<200> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    Serial.println("[ERROR] JSON parse failed!");
    return;
  }

  unsigned long interval = doc["delay"] | configs[deviceId].interval;
  float critical = doc["criticalValue"] | configs[deviceId].critical;

  applyConfig(deviceId, interval, critical);
  saveConfigsToEEPROM();
}

void applyConfig(int deviceId, unsigned long interval, float critical) {
  configs[deviceId].interval = interval;
  configs[deviceId].critical = critical;
  Serial.printf("[CONFIG] Device %d updated: interval=%lu ms, critical=%.2f\n",
                deviceId, interval, critical);
}

// ========================= SENSOR LOGIC =========================
void readSensors() {
  int dhtResult = dht11.readTemperatureHumidity(temperature, humidity);
  if (dhtResult != 0) temperature = humidity = -1;

  lpg = mq2.readLPG();
  methane = mq2.readMethane();
  smoke = mq2.readSmoke();
  flameDetected = (digitalRead(PIN_FLAME) == LOW);
  lightDetected = (digitalRead(PIN_LIGHT) == LOW);
}

void publishSensorIfDue() {
  unsigned long now = millis();

  struct {
    int id;
    float value;
  } sensors[] = {
    {1, (float)temperature},
    {2, (float)humidity},
    {3, lpg},
    {4, methane},
    {5, smoke},
    {6, (float)flameDetected},
    {7, (float)lightDetected}
  };

    for (auto &s : sensors) {
      if (s.id >= NUM_DEVICES) continue;

      unsigned long interval = configs[s.id].interval;
      float crit = configs[s.id].critical;
      bool critical = (s.value >= crit);
      // Track for display
      isCritical[s.id] = critical;
      if (critical)
        Serial.printf("[ALERT] Device %d critical (%.1f >= %.1f)\n",
                s.id, s.value, crit);

      if (now - lastSend[s.id] >= interval || critical) {
        char payload[16];
        snprintf(payload, sizeof(payload), "%.1f", s.value);
        String topic = buildTopic(s.id, "measurements");
        publishMeasurement(topic.c_str(), payload);
        lastSend[s.id] = now;
      }
  }
}

// ========================= PUBLISH =========================
void publishMeasurement(const char* topic, const char* payload) {
  mqttClient.publish(topic, payload, true);
  Serial.printf("[MQTT] %s => %s\n", topic, payload);
}

// ========================= DISPLAY =========================
void displayStartup() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);
  u8g2.drawStr(10, 20, "Env Monitor v2.0");
  u8g2.drawStr(10, 40, "Initializing...");
  u8g2.sendBuffer();
  delay(2000);
}

void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);

  char tempStr[16], humStr[16], lpgStr[16], ch4Str[16], smokeStr[16], flameStr[16], lightStr[16];

  if (temperature == -1) snprintf(tempStr, sizeof(tempStr), "T:ERR");
  else snprintf(tempStr, sizeof(tempStr), "T:%dC%s", temperature, isCritical[1] ? " [!]" : "");

  if (humidity == -1) snprintf(humStr, sizeof(humStr), "H:ERR");
  else snprintf(humStr, sizeof(humStr), "H:%d%%%s", humidity, isCritical[2] ? "[!]" : "");

  snprintf(lpgStr, sizeof(lpgStr), "LPG:%.1f%s", lpg, isCritical[3] ? "[!]" : "");
  snprintf(ch4Str, sizeof(ch4Str), "CH4:%.1f%s", methane, isCritical[4] ? "[!]" : "");
  snprintf(smokeStr, sizeof(smokeStr), "Smoke:%.1f%s", smoke, isCritical[5] ? "[!]" : "");
  snprintf(flameStr, sizeof(flameStr), "Flame:%s%s", flameDetected ? "YES" : "NO", isCritical[6] ? "[!]" : "");
  snprintf(lightStr, sizeof(lightStr), "Light:%s%s", lightDetected ? "YES" : "NO", isCritical[7] ? "[!]" : "");

  int leftColX = 5, rightColX = 60;
  int rowY = 12, rowSpacing = 14;

  u8g2.drawStr(leftColX, rowY, tempStr); yield();
  rowY += rowSpacing; u8g2.drawStr(leftColX, rowY, humStr); yield();
  rowY += rowSpacing; u8g2.drawStr(leftColX, rowY, lpgStr); yield();

  char timeStr[24];
  snprintf(timeStr, sizeof(timeStr), "%s",
           (WiFi.status() == WL_CONNECTED) ? "+ " : "- ");
  rowY += rowSpacing; u8g2.drawStr(leftColX, rowY, timeStr); yield();

  rowY = 12;
  u8g2.drawStr(rightColX, rowY, ch4Str); yield();
  rowY += rowSpacing; u8g2.drawStr(rightColX, rowY, smokeStr); yield();
  rowY += rowSpacing; u8g2.drawStr(rightColX, rowY, flameStr); yield();
  rowY += rowSpacing; u8g2.drawStr(rightColX, rowY, lightStr); yield();

  u8g2.sendBuffer();
  yield();
}

// ========================= CONFIG =========================
void saveConfigsToEEPROM() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.put(CONFIG_START_ADDR, configs);
  EEPROM.commit();
  EEPROM.end();
  Serial.println("[EEPROM] Configurations saved");
}

void loadConfigsFromEEPROM() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(CONFIG_START_ADDR, configs);
  EEPROM.end();

  // Проверим корректность данных
  bool valid = true;
  for (int i = 1; i < NUM_DEVICES; i++) {
    if (configs[i].interval == 0 || configs[i].interval > 3600000UL) valid = false;
  }

  if (!valid) {
    Serial.println("[EEPROM] Invalid config, using defaults");
    initDefaultConfigs();
  } else {
    Serial.println("[EEPROM] Loaded saved configuration");
  }
}
