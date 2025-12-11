#pragma once
#include <Arduino.h>

class ServerManager {
public:
    static void begin();
    static void connect();
    static void loop();
    static bool isConfigured();

    // getters for AP info
    static String getSsid();
    static String getPass();
    static String getSavedSsid();

private:
    static void startAPMode();
    static bool tryConnectWiFi();
    static void handleRootPage();
    static void handleSavePage();

    static String apSsid;
    static String apPass;
};
