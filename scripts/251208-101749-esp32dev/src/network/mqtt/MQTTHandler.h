#ifndef MQTTHANDLER_H
#define MQTTHANDLER_H

#include <Arduino.h>

#define FIRMWARE_VERSION "2.0.0"

/*
 * Topics (userId is entered in the setup portal, hardwareId is derived from the chip):
 *   publish   users/<userId>/controllers/<hardwareId>/hello          {"platform","fw","ip","v"}
 *   subscribe users/<userId>/controllers/<hardwareId>/configuration  devices to run (retained)
 *   subscribe users/<userId>/devices/+/command                       value for an output device
 *   publish   users/<userId>/devices/<deviceId>/measurements         value
 */

void initMQTT();
void mqttLoop();
bool mqttConnected();
bool publishMeasurement(uint32_t deviceId, float value);

// Unique id of this board, e.g. esp8266-1a2b3c
const String &hardwareId();

#endif
