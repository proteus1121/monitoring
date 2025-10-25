#include <DHT11.h>
#include <TroykaMQ.h>
#include <Arduino.h>
#include <U8g2lib.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ESP8266HTTPClient.h>

// Pin definitions
#define PIN_MQ2   A0   // MQ-2 analog pin
#define PIN_DHT   D0   // DHT11 data pin
#define PIN_FLAME D1   // Flame sensor digital pin
#define PIN_LIGHT D8   // Light sensor analog pin

// WiFi
#define WIFI_SSID "wi-fi-name"
#define WIFI_PASS "wi-fi-pass"

IPAddress _ip(192,168,1,50);
IPAddress _gw(192,168,1,1);
IPAddress _sn(255,255,255,0);
IPAddress _dns(192,168,1,1);

// MQTT
#define MQTT_SERVER "139.59.148.159"
#define MQTT_PORT   1883
#define MQTT_USER   ""
#define MQTT_PASS   ""

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1800000; // 30 minutes

unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastWifiReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // 5 sec

MQ2 mq2(PIN_MQ2);
DHT11 dht11(PIN_DHT);

WiFiClient espClient;
PubSubClient client(espClient);

// Software SPI, 4-wire, reset on D4
U8G2_ST7565_NHD_C12864_F_4W_SW_SPI u8g2(
  U8G2_R2, D5, D6, D2, D7, D4
);

void setup() {
  Serial.begin(9600);
  Serial.println("Starting monitoring program");
  delay(2000);

  u8g2.begin();
  u8g2.setContrast(200);
  u8g2.enableUTF8Print();

  // --- Startup screen ---
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);
  u8g2.drawStr(10, 20, "Env Monitor v1.0");
  u8g2.drawStr(10, 40, "Initializing...");
  u8g2.sendBuffer();
  delay(2000);

  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_LIGHT, INPUT);

  mq2.calibrate();
  yield();
  delay(100);
  Serial.print("MQ-2 Ro = ");
  Serial.println(mq2.getRo());

  // Show MQ2 calibration info
  u8g2.clearBuffer();
  u8g2.drawStr(10, 20, "MQ2 Calibrated");
  u8g2.sendBuffer();
  delay(1000);

  WiFi.config(_ip, _gw, _sn, _dns);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  u8g2.clearBuffer();
  u8g2.drawStr(10, 20, "WiFi connecting...");
  u8g2.sendBuffer();

  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  unsigned long now = millis();

  // --- Non-blocking WiFi reconnect ---
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiReconnectAttempt > reconnectInterval) {
      lastWifiReconnectAttempt = now;
      Serial.println("WiFi lost. Reconnecting...");
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      testInternet();
    }
  }

  // --- Non-blocking MQTT reconnect ---
  if (!client.connected() && WiFi.status() == WL_CONNECTED) {
    if (now - lastMqttReconnectAttempt > reconnectInterval) {
      lastMqttReconnectAttempt = now;
      Serial.println("Attempting MQTT connection...");
      if (client.connect("ESP8266Client", MQTT_USER, MQTT_PASS)) {
        Serial.println("MQTT connected");
      } else {
        Serial.print("MQTT failed, rc=");
        Serial.println(client.state());
      }
    }
  } else if (client.connected()) {
    client.loop();
  }

  // --- Sensor reads ---
  int t = 0, h = 0;
  int dhtResult = dht11.readTemperatureHumidity(t, h);

  char tempStr[16];
  char humStr[16];
  if (dhtResult == 0) {
    snprintf(tempStr, sizeof(tempStr), "T:%dC", t);
    snprintf(humStr, sizeof(humStr), "H:%d%%", h);
  } else {
    snprintf(tempStr, sizeof(tempStr), "T:ERR");
    snprintf(humStr, sizeof(humStr), "H:ERR");
  }

  float lpg     = mq2.readLPG(); yield();
  float methane = mq2.readMethane(); yield();
  float smoke   = mq2.readSmoke(); yield();

  char lpgStr[16], ch4Str[16], smokeStr[16];
  snprintf(lpgStr, sizeof(lpgStr), "LPG:%.1f", lpg);
  snprintf(ch4Str, sizeof(ch4Str), "CH4:%.1f", methane);
  snprintf(smokeStr, sizeof(smokeStr), "Smoke:%.1f", smoke);

  bool flameDetected = digitalRead(PIN_FLAME) == LOW;
  char flameStr[16];
  snprintf(flameStr, sizeof(flameStr), "Flame:%s", flameDetected ? "YES" : "NO");

  bool lightDetected = analogRead(PIN_LIGHT) == LOW;
  char lightStr[16];
  snprintf(lightStr, sizeof(lightStr), "Light:%s", lightDetected ? "YES" : "NO");

  // --- MQTT publish ---
  if (client.connected()) {
    if ((now - lastSendTime) >= sendInterval || lastSendTime == 0) {
      lastSendTime = now;

      if (dhtResult == 0) {
        char buf[8];
        snprintf(buf, sizeof(buf), "%d", t);
        client.publish("users/1/devices/1/measurements", buf, true);
        snprintf(buf, sizeof(buf), "%d", h);
        client.publish("users/1/devices/2/measurements", buf, true);
      }

      char buf[16];
      snprintf(buf, sizeof(buf), "%.1f", lpg);
      client.publish("users/1/devices/3/measurements", buf, true);
      snprintf(buf, sizeof(buf), "%.1f", methane);
      client.publish("users/1/devices/4/measurements", buf, true);
      snprintf(buf, sizeof(buf), "%.1f", smoke);
      client.publish("users/1/devices/5/measurements", buf, true);
      client.publish("users/1/devices/6/measurements", flameDetected ? "1" : "0", true);
      client.publish("users/1/devices/7/measurements", lightDetected ? "1" : "0", true);

      Serial.println("MQTT data sent");
    }
  }

  // --- LCD update ---
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);

  int leftColX = 5, rightColX = 60;
  int rowY = 12, rowSpacing = 14;

  u8g2.drawStr(leftColX, rowY, tempStr);
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, humStr);
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, lpgStr);

  unsigned long elapsed = now - lastSendTime;  // milliseconds since last send

  unsigned int seconds = (elapsed / 1000) % 60;
  unsigned int minutes = (elapsed / 60000) % 60;

  char timeStr[16];
  snprintf(timeStr, sizeof(timeStr), "%02u:%02u", minutes, seconds);
  char wifiTimeStr[24];
  snprintf(wifiTimeStr, sizeof(wifiTimeStr), "%s%s", (WiFi.status() == WL_CONNECTED) ? "+, " : "-, ", timeStr);

  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, wifiTimeStr);

  rowY = 12;
  u8g2.drawStr(rightColX, rowY, ch4Str);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, smokeStr);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, flameStr);
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, lightStr);

  yield();
  u8g2.sendBuffer();
  yield();
}

void testInternet() {
  WiFiClient client;
  if (client.connect("8.8.8.8", 53)) {
    Serial.println("Internet reachable (8.8.8.8 connected)");
    client.stop();
  } else {
    Serial.println("Cannot reach 8.8.8.8");
  }
}
