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
#define PIN_LIGHT D8   // light sensor digital pin

// WiFi (not used here but kept for reference)
#define WIFI_SSID "wi-fi-name"
#define WIFI_PASS "wi-fi-pass"

IPAddress _ip(192,168,1,50);     // свободный адрес в вашей сети
IPAddress _gw(192,168,1,1);      // ваш роутер
IPAddress _sn(255,255,255,0);    // маска
IPAddress _dns(192,168,1,1);     // DNS через роутер

// MQTT
#define MQTT_SERVER "139.59.148.159"
#define MQTT_PORT   1883
#define MQTT_USER   ""                // optional
#define MQTT_PASS   ""                // optional

MQ2 mq2(PIN_MQ2);
DHT11 dht11(PIN_DHT);

WiFiClient espClient;
PubSubClient client(espClient);

// Software SPI, 4-wire, reset on D4
U8G2_ST7565_NHD_C12864_F_4W_SW_SPI u8g2(
  U8G2_R2,  // rotate 180°
  D5,       // SCL (clock)
  D6,       // SI (data)
  D2,       // CS
  D7,       // DC
  D4        // RESET
);

void setup() {
  delay(2000);
  
  Serial.begin(9600);
  
  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_LIGHT, INPUT);

  // MQ-2 calibration (~60 sec)
  mq2.calibrate();
  Serial.print("MQ-2 Ro = ");
  Serial.println(mq2.getRo());

  // Initialize LCD
  u8g2.begin();
  u8g2.setContrast(200);
  u8g2.enableUTF8Print();

  WiFi.config(_ip, _gw, _sn, _dns);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());

  Serial.print("Subnet: ");
  Serial.println(WiFi.subnetMask());

  Serial.print("DNS: ");
  Serial.println(WiFi.dnsIP());
  testInternet();

  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  delay(2000);

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Read DHT11
  int t=0, h=0;
  int dhtResult = dht11.readTemperatureHumidity(t, h);
  String tempStr = (dhtResult == 0) ? "T:" + String(t) + "C" : "T:ERR";
  String humStr  = (dhtResult == 0) ? "H:" + String(h) + "%" : "H:ERR";

  // Read MQ-2
  float lpg     = mq2.readLPG();
  float methane = mq2.readMethane();
  float smoke   = mq2.readSmoke();

  String lpgStr    = "LPG:" + String(lpg,1);
  String ch4Str    = " CH4:" + String(methane,1);
  String smokeStr = "Smoke:" + String(smoke,1);

  // Read Flame
  bool flameDetected = digitalRead(PIN_FLAME) == LOW;
  String flameStr = flameDetected ? "Flame: YES" : "Flame: NO";

  // Read Light
  bool lightDetected = analogRead(PIN_LIGHT) == LOW;
  String lightStr = lightDetected ? "Light: YES" : "Light: NO";

  // Serial output
  Serial.println(tempStr + " " + humStr);
  Serial.println(lpgStr + " " + ch4Str + " " + smokeStr);
  Serial.println(flameStr);
  Serial.println(lightStr);

  // --- MQTT publish ---
  if (dhtResult == 0) {
    client.publish("sensor/temperature", String(t).c_str(), true);
    client.publish("sensor/humidity", String(h).c_str(), true);
  }
  client.publish("home/sensors/lpg", String(lpg,1).c_str(), true);
  client.publish("home/sensors/ch4", String(methane,1).c_str(), true);
  client.publish("home/sensors/smoke", String(smoke,1).c_str(), true);
  client.publish("home/sensors/flame", flameDetected ? "1" : "0", true);
  client.publish("home/sensors/light", lightDetected ? "1" : "0", true);

  // LCD output
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_guildenstern_nbp_t_all);

  int leftColX = 5;
  int rightColX = 60;
  int rowY = 12;
  int rowSpacing = 14;

  // Left column
  u8g2.drawStr(leftColX, rowY, tempStr.c_str());
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, humStr.c_str());
  rowY += rowSpacing;
  u8g2.drawStr(leftColX, rowY, lpgStr.c_str());

  // Right column
  rowY = 12;  // reset Y
  u8g2.drawStr(rightColX, rowY, ch4Str.c_str());
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, smokeStr.c_str());
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, flameStr.c_str());
  rowY += rowSpacing;
  u8g2.drawStr(rightColX, rowY, lightStr.c_str());

  u8g2.sendBuffer();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP8266Client", MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void testInternet() {
  WiFiClient client;
  if (client.connect("8.8.8.8", 53)) {  // DNS server, port 53
    Serial.println("Internet reachable (8.8.8.8 connected)");
    client.stop();
  } else {
    Serial.println("Cannot reach 8.8.8.8");
  }
}
