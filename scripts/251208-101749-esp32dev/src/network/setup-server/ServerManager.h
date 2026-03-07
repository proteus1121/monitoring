#pragma once
#include <Arduino.h>

class ServerManager {
public:
    static void begin();
    static void connect();
    static void loop();
    static bool isConfigured();

    // helper to force entry into setup mode (Wi‑Fi AP)
    static void enterSetupMode();

    // number of times to attempt a WiFi connection before
    // falling back to AP/setup mode
    static const int WIFI_CONNECT_RETRIES = 10;

    // getters for AP info
    static String getSsid();
    static String getPass();
    static String getSavedSsid();

private:
    static void startAPMode();
    static void scanWiFiNetworks();
    static bool tryConnectWiFi();
    static void handleRootPage();
    static void handleSavePage();

    static String apSsid;
    static String apPass;
};
