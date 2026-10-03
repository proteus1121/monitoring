#include "Ota.h"
#include "../display/Screens.h"
#include "../network/mqtt/MQTTHandler.h"
#include <Arduino.h>
#include <ArduinoOTA.h>

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif

#ifndef OTA_PASSWORD
#define OTA_PASSWORD ""
#endif

namespace {

bool started = false;
bool warned = false;
bool updating = false;
int lastPercent = -1;
int percentShown = 0;

void showProgress(const char *state) {
    Screens::ota(percentShown, state);
}

void begin() {
    ArduinoOTA.setHostname(hardwareId().c_str());
    ArduinoOTA.setPassword(OTA_PASSWORD);

    ArduinoOTA.onStart([]() {
        updating = true;
        lastPercent = -1;
        Serial.println("[OTA] Update started");
        percentShown = 0;
        showProgress("receiving");
    });
    ArduinoOTA.onProgress([](unsigned int done, unsigned int total) {
        int percent = total ? (int)(done * 100UL / total) : 0;
        if (percent / 10 != lastPercent / 10) {
            lastPercent = percent;
            Serial.printf("[OTA] %d%%\n", percent);
            percentShown = percent;
            showProgress((String(percent) + "%").c_str());
        }
    });
    ArduinoOTA.onEnd([]() {
        Serial.println("[OTA] Update finished, restarting");
        percentShown = 100;
        showProgress("done, restarting");
    });
    ArduinoOTA.onError([](ota_error_t error) {
        updating = false;
        Serial.printf("[OTA] Update failed, error %u\n", (unsigned)error);
        showProgress("failed, old firmware kept");
    });

    ArduinoOTA.begin();
    Serial.println("[OTA] Ready: " + hardwareId() + " at " + WiFi.localIP().toString());
}

} // namespace

namespace Ota {

void loop() {
    if (strlen(OTA_PASSWORD) == 0) {
        // an open OTA port lets anyone on the network replace the firmware
        if (!warned) {
            warned = true;
            Serial.println("[OTA] Disabled: no password in secrets.ini");
        }
        return;
    }
    if (!started) {
        if (WiFi.status() != WL_CONNECTED)
            return;
        begin();
        started = true;
    }
    ArduinoOTA.handle();
}

bool inProgress() {
    return updating;
}

} // namespace Ota
