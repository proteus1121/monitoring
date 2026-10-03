#pragma once
#include <Arduino.h>

/**
 * Wi-Fi connection and the setup page served by the board's own access point.
 *
 * The page has three states:
 *  - setup:   Wi-Fi (and, folded away, MQTT) settings; shown when Wi-Fi is not configured or does not
 *             connect, and after a double RST press;
 *  - pairing: Wi-Fi works but the board has no account; the access point stays up next to the Wi-Fi
 *             connection and the page shows the code to enter on the site;
 *  - paired:  reached by a double RST press; Wi-Fi settings plus "unlink from account".
 */
class ServerManager {
public:
    static void begin();
    static void connect();
    static void loop();
    static bool isConfigured();

    // Wi-Fi setup page on the access point (Wi-Fi client off)
    static void enterSetupMode();
    // keep the access point next to the Wi-Fi connection so the page can show the pairing code
    static void startPairingPortal();

    // number of times to attempt a WiFi connection before falling back to AP/setup mode
    static const int WIFI_CONNECT_RETRIES = 5;

    // getters for AP info
    static String getSsid();
    static String getPass();
    static String getSavedSsid();

private:
    static void startAPMode();
    static void startServer();
    static bool tryConnectWiFi();
    static void handleRootPage();
    static void handleSavePage();
    static void handleUnpair();

    static String apSsid;
    static String apPass;
};
