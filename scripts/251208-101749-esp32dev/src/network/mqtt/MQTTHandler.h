#ifndef MQTTHANDLER_H
#define MQTTHANDLER_H

#include <Arduino.h>

void initMQTT();
void mqttLoop();
void reconnectMQTT();
void publishSensorValue(uint8_t deviceId, float value);
void requestConfiguration();
void mqttCallback(char *topic, byte *payload, unsigned int length);

#endif