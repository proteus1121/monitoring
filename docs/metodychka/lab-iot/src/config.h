#pragma once
#include <DHTesp.h>

// мережа і брокер – дані від викладача
#define WIFI_SSID      "lab-iot"
#define WIFI_PASS      "********"
#define MQTT_HOST      "192.168.1.10"
#define MQTT_PORT      1883
#define MQTT_USER      "student"
#define MQTT_PASS      "********"
#define TOPIC_PREFIX   "lab/ki-21/ivanenko/"

// розподіл виводів (додаток А)
const uint8_t PIN_LED    = 25;
const uint8_t PIN_RELAY  = 26;
const uint8_t PIN_BUTTON = 27;
const uint8_t PIN_DHT    = 4;
const uint8_t PIN_MQ2    = 34;
const uint8_t PIN_SOIL   = 35;
const uint8_t PIN_FLAME  = 14;
const uint8_t PIN_PIR    = 13;
const uint8_t PIN_SDA    = 21;
const uint8_t PIN_SCL    = 22;

// модель датчика: DHTesp::DHT22 або DHTesp::DHT11
const DHTesp::DHT_MODEL_t DHT_TYPE = DHTesp::DHT22;

// калібрування датчика ґрунту, мВ на GPIO35 (підрозділ 4.7)
const float SOIL_DRY_MV = 2200;    // сухий субстрат
const float SOIL_WET_MV = 1000;    // перезволожений субстрат

const unsigned long PUBLISH_INTERVAL_MS = 10000;
