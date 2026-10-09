#pragma once
#include <Arduino.h>

/**
 * Words on the board's screens in the language chosen on the site (the language select on the board card). Ukrainian until
 * the site sends a choice; the choice is kept in flash so the setup screens use it from power-on.
 *
 * The strings sit in flash (PROGMEM): the ESP8266 would keep them in RAM otherwise. Keep them short: the screen is
 * 128 px wide, about 25 small or 21 normal characters. The Cyrillic fonts have no "°" and no "’": use "'".
 */
#define DISPLAY_TEXTS(X)                                                                         \
    X(FIRMWARE, "firmware ", "прошивка ")                                                         \
    X(NO_WIFI_SAVED, "No Wi-Fi saved", "Wi-Fi не задано")                                          \
    X(OPENING_SETUP, "Opening setup", "Відкриваю налаштування")                                    \
    X(CONNECTING_TO, "Connecting to", "Підключення до")                                            \
    X(PLEASE_WAIT, "please wait", "зачекайте")                                                     \
    X(SETUP, "Setup", "Налаштування")                                                              \
    X(JOIN_WIFI, "1. Join Wi-Fi", "1. Мережа Wi-Fi")                                               \
    X(PASS, "pass ", "пароль ")                                                                    \
    X(OPEN_IN_BROWSER, "2. Open in a browser", "2. Відкрийте в браузері")                          \
    X(LINK_TO_ACCOUNT, "Link to account", "Прив'язка")                                             \
    X(ON_YOUR_WIFI_OPEN, "On your Wi-Fi open", "У своєму Wi-Fi відкрийте")                         \
    X(AND_PRESS_SIGN_IN, "and press Sign in", "і натисніть Sign in")                               \
    X(OPEN_PRESS_SIGN_IN, "2. Open, press Sign in", "2. Відкрийте, Sign in")                       \
    X(NO_DEVICES_YET, "No devices yet", "Пристроїв ще немає")                                      \
    X(ADD_THEM_ON, "Add them on", "Додайте їх на")                                                 \
    X(UPDATE, "Update", "Оновлення")                                                               \
    X(UPDATING_FIRMWARE, "Updating firmware", "Оновлення прошивки")                                \
    X(DO_NOT_POWER_OFF, "Do not power off", "Не вимикайте живлення")                               \
    X(OTA_CONNECTING, "connecting", "підключення")                                                 \
    X(OTA_CONNECTING_WIFI, "connecting to Wi-Fi", "підключення до Wi-Fi")                          \
    X(OTA_DOWNLOADING, "downloading", "завантаження")                                              \
    X(OTA_RECEIVING, "receiving", "отримання")                                                     \
    X(OTA_RESTART_TO_DOWNLOAD, "restarting to download", "перезапуск, завантаження")               \
    X(OTA_FAILED, "failed, old firmware kept", "не вдалося, стара прошивка")                       \
    X(OTA_DONE, "done, restarting", "готово, перезапуск")                                          \
    X(TEMPERATURE, "Temperature", "Температура")                                                   \
    X(HUMIDITY, "Humidity", "Вологість")                                                           \
    X(PRESSURE, "Pressure", "Тиск")                                                                \
    X(SMOKE, "Smoke", "Дим")                                                                       \
    X(FLAME, "Flame", "Полум'я")                                                                   \
    X(LIGHT, "Light", "Світло")                                                                    \
    X(MOTION, "Motion", "Рух")                                                                     \
    X(INPUT_, "Input", "Вхід")                                                                     \
    X(ANALOG_IN, "Analog", "Аналог")                                                                  \
    X(SOIL, "Soil", "Ґрунт")                                                                       \
    X(RELAY, "Relay", "Реле")                                                                      \
    X(METHANE, "Methane", "Метан")                                                                 \
    X(LPG, "LPG", "Пропан")                                                                        \
    X(FLAME_ON, "FLAME!", "ВОГОНЬ!")                                                               \
    X(FLAME_OFF, "none", "немає")                                                                  \
    X(MOTION_ON, "motion", "рух")                                                                  \
    X(MOTION_OFF, "still", "спокій")                                                               \
    X(LIGHT_ON, "light", "світло")                                                                 \
    X(LIGHT_OFF, "dark", "темно")                                                                  \
    X(RELAY_ON, "ON", "УВІМК")                                                                     \
    X(RELAY_OFF, "OFF", "ВИМК")                                                                    \
    X(HIGH_, "high", "високий")                                                                    \
    X(LOW_, "low", "низький")                                                                      \
    X(HPA, "hPa", "гПа")

namespace Texts {

enum Lang : uint8_t { UK = 0, EN = 1 };

enum Id : uint8_t {
#define TEXT_ID(id, en, uk) id,
    DISPLAY_TEXTS(TEXT_ID)
#undef TEXT_ID
    COUNT
};

// the language saved in flash, Ukrainian when none was
void begin();
Lang language();
// "UK" / "EN" from the configuration; saved and true when it changed, anything else is ignored
bool setLanguage(const String &code);

} // namespace Texts

// the text in the current language
String tr(Texts::Id id);
