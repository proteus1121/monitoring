#pragma once
#include <Arduino.h>

/**
 * Wi-Fi connection and the setup page served by the board's own access point.
 *
 * The page has three states:
 *  - setup:   Wi-Fi (and, folded away, MQTT) settings; shown when Wi-Fi is not configured or does not
 *             connect, and after holding BOOT / FLASH for 3 s;
 *  - link:    Wi-Fi works but the board has no account; the access point stays up next to the Wi-Fi
 *             connection. On the home network the page has "Sign in": the site links the board and sends the
 *             browser back to /connect with the board's own MQTT login; on the access point it shows that
 *             address, the phone has no internet there;
 *  - linked:  reached by holding BOOT / FLASH for 3 s; Wi-Fi settings plus "unlink from account".
 */
class ServerManager {
public:
    static void begin();
    static void connect();
    static void loop();
    static bool isConfigured();

    // Wi-Fi setup page on the access point (Wi-Fi client off)
    static void enterSetupMode();
    // keep the access point next to the Wi-Fi connection and serve the page on both, to sign in from it
    static void startLinkPortal();

    // number of times to attempt a WiFi connection before falling back to AP/setup mode
    static const int WIFI_CONNECT_RETRIES = 5;

    // getters for AP info
    static String getSsid();
    static String getPass();
    static String getSavedSsid();
    // station mode with the saved Wi-Fi, one attempt
    static bool tryConnectWiFi();

private:
    static void startAPMode();
    static void startServer();
    static void handleRootPage();
    static void handleSavePage();
    static void handleUnpair();
    static void handleConnect();

    static String apSsid;
    static String apPass;
};
