#ifndef MQTTHANDLER_H
#define MQTTHANDLER_H

#include <Arduino.h>

// may be set by the build, e.g. PLATFORMIO_BUILD_FLAGS=-DFIRMWARE_VERSION=\"2.3.9\" for a test build
#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "2.6.0"
#endif

// env name of platformio.ini, the site picks update files by it
#ifndef BOARD_ID
#define BOARD_ID "unknown"
#endif

// site where the user signs in to link the board
#define SITE_HOST "ssn.pp.ua"

/*
 * Topics (userId and the MQTT login come from linking the board on the site, hardwareId is derived from the
 * chip; the broker lets a board use its owner's users/<userId>/# only):
 *   publish   users/<userId>/controllers/<hardwareId>/hello          {"platform","board","fw","ip","v","disp"}
 *   subscribe users/<userId>/controllers/<hardwareId>/configuration  devices to run (retained)
 *             {"unpair":true} instead when the board was deleted on the site
 *   subscribe users/<userId>/devices/+/command                       value for an output device
 *   publish   users/<userId>/devices/<deviceId>/measurements         value
 *   publish   users/<userId>/devices/<deviceId>/raw                  raw ADC value of an analog sensor
 *   subscribe users/<userId>/controllers/<hardwareId>/scan           look for modules on free pins
 *   publish   users/<userId>/controllers/<hardwareId>/scan-result    what was found
 *   subscribe users/<userId>/controllers/<hardwareId>/update         new firmware to install
 *   publish   users/<userId>/controllers/<hardwareId>/update-status  its progress
 */

void initMQTT();
void mqttLoop();
bool mqttConnected();
bool publishMeasurement(uint32_t deviceId, float value);
// raw ADC value behind a measurement, for calibrating the sensor: users/<userId>/devices/<deviceId>/raw
bool publishRaw(uint32_t deviceId, float value);
// result of a board scan (system/Scanner.h) to users/<userId>/controllers/<hardwareId>/scan-result
bool publishScanResult(const String &payload);
// progress of a firmware update (system/FirmwareUpdate.h)
bool publishUpdateStatus(const String &payload);

// the board has an account and its own MQTT login (from "Sign in" on its page); without them it does not
// connect to MQTT at all
bool isLinked();
// account and MQTT login gone (unlinked here or removed on the site): link again after a restart
void forgetAccount();

// Unique id of this board, e.g. esp8266-1a2b3c
const String &hardwareId();

#endif
