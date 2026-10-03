#ifndef MQTTHANDLER_H
#define MQTTHANDLER_H

#include <Arduino.h>

#define FIRMWARE_VERSION "2.3.0"

// site where the user signs in and enters the pairing code
#define SITE_HOST "ssn.pp.ua"

/*
 * Topics (userId is entered in the setup portal, hardwareId is derived from the chip):
 *   publish   users/<userId>/controllers/<hardwareId>/hello          {"platform","fw","ip","v","disp"}
 *   subscribe users/<userId>/controllers/<hardwareId>/configuration  devices to run (retained)
 *             {"unpair":true} instead when the board was deleted on the site
 *   subscribe users/<userId>/devices/+/command                       value for an output device
 *   publish   users/<userId>/devices/<deviceId>/measurements         value
 *   subscribe users/<userId>/controllers/<hardwareId>/scan           look for modules on free pins
 *   publish   users/<userId>/controllers/<hardwareId>/scan-result    what was found
 */

void initMQTT();
void mqttLoop();
bool mqttConnected();
bool publishMeasurement(uint32_t deviceId, float value);
// result of a board scan (system/Scanner.h) to users/<userId>/controllers/<hardwareId>/scan-result
bool publishScanResult(const String &payload);

/*
 * Pairing, while the board has no account:
 *   publish   pairing/<hardwareId>/request   {"platform","fw"}
 *   subscribe pairing/<hardwareId>/code      {"code":"4F7K2Q","expiresIn":900}
 *   subscribe pairing/<hardwareId>/result    {"userId":1} -> stored, the board restarts
 */
bool isPairing();
// empty until the server answered
const String &pairingCode();

// Unique id of this board, e.g. esp8266-1a2b3c
const String &hardwareId();

#endif
