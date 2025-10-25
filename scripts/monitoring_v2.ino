#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ESP8266HTTPClient.h>
#include <U8g2lib.h>
#include <DHT11.h>
#include <TroykaMQ.h>

// ========================= CONFIG =========================
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

// Timing
const unsigned long SEND_INTERVAL = 1800000;  // 30 min
const unsigned long RECONNECT_INTERVAL = 5000;
const unsigned long DISPLAY_INTERVAL = 1000;

// ========================= GLOBAL OBJECTS =========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
MQ2 mq2(PIN_MQ2);
DHT11 dht11(PIN_DHT);
U8G2_ST7565_NHD_C12864_F_4W_SW_SPI u8g2(U8G2_R2, D5, D6, D2, D7, D4);

// State
unsigned long lastSendTime = 0;
unsigned long lastWifiReconnectAttempt = 0;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastDisplayUpdate = 0;

// Sensor cache
int temperature = 0;
int humidity = 0;
float lpg = 0;
float methane = 0;
float smoke = 0;
bool flameDetected = false;
bool lightDetected = false;

// ========================= FUNCTION DECLARATIONS =========================
void connectWiFi();
void connectMQTT();
void readSensors();
void publishMeasurements();
void updateDisplay();
void displayStartup();
void testInternet();
void publishMeasurement(const char* topic, const char* payload);

// ========================= SETUP =========================
void setup() {
  Serial.begin(9600);
  Serial.println("\n[BOOT] Starting Environmental Monitor v1.0");

  u8g2.begin();
  u8g2.setContrast(200);
  u8g2.enableUTF8Print();
  displayStartup();

  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_LIGHT, INPUT);

  mq2.calibrate();
  Serial.print("[MQ2] Calibrated, Ro = ");
  Serial.println(mq2.getRo());

  WiFi.config(ip, gw, sn, dns);
  connectWiFi();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

// ========================= MAIN LOOP =========================
void loop() {
  unsigned long now = millis();

  // Non-blocking WiFi reconnect
  if (WiFi.status() != WL_CONNECTED && now - lastWifiReconnectAttempt > RECONNECT_INTERVAL) {
    lastWifiReconnectAttempt = now;
    connectWiFi();
  }

  // Non-blocking MQTT reconnect
  if (!mqttClient.connected() && WiFi.status() == WL_CONNECTED && now - lastMqttReconnectAttempt > RECONNECT_INTERVAL) {
    lastMqttReconnectAttempt = now;
    connectMQTT();
  }

  mqttClient.loop();

  // Sensor readings and publish
  if (mqttClient.connected() && (now - lastSendTime >= SEND_INTERVAL || lastSendTime == 0)) {
    readSensors();
    publishMeasurements();
    lastSendTime = now;
  }

  // LCD update
  if (now - lastDisplayUpdate > DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = now;
  }
}

// ========================= WIFI =========================
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);
  u8g2.drawStr(10, 20, "Connecting WiFi...");
  u8g2.sendBuffer();

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
  } else {
    Serial.println("\n[WiFi] Connection timeout.");
  }
}

// ========================= MQTT =========================
void connectMQTT() {
  Serial.print("[MQTT] Connecting...");
  if (mqttClient.connect("ESP8266Client", MQTT_USER, MQTT_PASS)) {
    Serial.println("connected");
  } else {
    Serial.printf("failed (rc=%d)\n", mqttClient.state());
  }
}

// ========================= SENSORS =========================
void readSensors() {
  int dhtResult = dht11.readTemperatureHumidity(temperature, humidity);
  if (dhtResult != 0) {
    temperature = humidity = -1; // mark as error
  }

  lpg = mq2.readLPG();
  methane = mq2.readMethane();
  smoke = mq2.readSmoke();
  flameDetected = (digitalRead(PIN_FLAME) == LOW);
  lightDetected = (analogRead(PIN_LIGHT) == LOW);

  Serial.printf("[SENSORS] T=%dC H=%d%% LPG=%.1f CH4=%.1f Smoke=%.1f Flame=%d Light=%d\n",
                temperature, humidity, lpg, methane, smoke, flameDetected, lightDetected);
}

// ========================= MQTT PUBLISH =========================
void publishMeasurements() {
  if (temperature != -1) {
    char buf[8];
    snprintf(buf, sizeof(buf), "%d", temperature);
    publishMeasurement("users/1/devices/1/measurements", buf);

    snprintf(buf, sizeof(buf), "%d", humidity);
    publishMeasurement("users/1/devices/2/measurements", buf);
  }

  char buf[16];
  snprintf(buf, sizeof(buf), "%.1f", lpg);
  publishMeasurement("users/1/devices/3/measurements", buf);

  snprintf(buf, sizeof(buf), "%.1f", methane);
  publishMeasurement("users/1/devices/4/measurements", buf);

  snprintf(buf, sizeof(buf), "%.1f", smoke);
  publishMeasurement("users/1/devices/5/measurements", buf);

  publishMeasurement("users/1/devices/6/measurements", flameDetected ? "1" : "0");
  publishMeasurement("users/1/devices/7/measurements", lightDetected ? "1" : "0");

  Serial.println("[MQTT] Data sent");
}

void publishMeasurement(const char* topic, const char* payload) {
  mqttClient.publish(topic, payload, true);
  yield();
}

// ========================= DISPLAY =========================
void displayStartup() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);
  u8g2.drawStr(10, 20, "Env Monitor v1.0");
  u8g2.drawStr(10, 40, "Initializing...");
  u8g2.sendBuffer();
  delay(2000);
}

void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);

  char tempStr[16], humStr[16], lpgStr[16], ch4Str[16], smokeStr[16], flameStr[16], lightStr[16];

  snprintf(tempStr, sizeof(tempStr), "T:%sC", (temperature == -1) ? "ERR" : String(temperature).c_str());
  snprintf(humStr, sizeof(humStr), "H:%s%%", (humidity == -1) ? "ERR" : String(humidity).c_str());
  snprintf(lpgStr, sizeof(lpgStr), "LPG:%.1f", lpg);
  snprintf(ch4Str, sizeof(ch4Str), "CH4:%.1f", methane);
  snprintf(smokeStr, sizeof(smokeStr), "Smoke:%.1f", smoke);
  snprintf(flameStr, sizeof(flameStr), "Flame:%s", flameDetected ? "YES" : "NO");
  snprintf(lightStr, sizeof(lightStr), "Light:%s", lightDetected ? "YES" : "NO");

  int leftColX = 5, rightColX = 60;
  int rowY = 12, rowSpacing = 14;

  u8g2.drawStr(leftColX, rowY, tempStr);
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, humStr);
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, lpgStr);

  unsigned long elapsed = millis() - lastSendTime;
  unsigned int seconds = (elapsed / 1000) % 60;
  unsigned int minutes = (elapsed / 60000) % 60;
  char timeStr[24];
  snprintf(timeStr, sizeof(timeStr), "%s%02u:%02u",
           (WiFi.status() == WL_CONNECTED) ? "+, " : "-, ",
           minutes, seconds);

  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, timeStr);

  rowY = 12;
  u8g2.drawStr(rightColX, rowY, ch4Str);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, smokeStr);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, flameStr);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, lightStr);

  u8g2.sendBuffer();
}

// ========================= INTERNET TEST =========================
void testInternet() {
  WiFiClient testClient;
  if (testClient.connect("8.8.8.8", 53)) {
    Serial.println("[NET] Internet reachable");
    testClient.stop();
  } else {
    Serial.println("[NET] No Internet access");
  }
}
