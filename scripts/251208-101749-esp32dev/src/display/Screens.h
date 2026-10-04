#pragma once
#include <Arduino.h>
#include <vector>

/**
 * Everything the board shows on its display, 128 x 64. Every screen but the splash has a status bar:
 * logo and name or title on the left, server link and Wi-Fi signal on the right.
 */
namespace Screens {

struct Tile {
    String label; // "Temp"
    String value; // "28.1", "--" before the first reading
    String unit;  // "°C", empty for on / off values
    bool alert;   // shown inverted, e.g. flame or motion detected
};

// logo with a short spin, the name and the firmware version
void splash(const char *version);

void connecting(const String &ssid);

// access point of the setup page
void setupMode(const String &ssid, const String &pass, const String &ip);

// no account yet: the address of the board's page, where "Sign in" links it
void link(const String &address);
// no account yet, the access point reaches the internet through the board: sign in right from it
void linkFromAccessPoint(const String &ssid, const String &pass, const String &ip);

void waitingForDevices(const char *site, const String &hardwareId);

// readings; more than four are shown in pages, switched with nextPage()
void devices(const std::vector<Tile> &tiles);

// next page of readings, called on a short press of the FLASH / BOOT button
void nextPage();

void ota(int percent, const char *state);

} // namespace Screens
