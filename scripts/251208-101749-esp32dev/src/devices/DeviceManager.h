#ifndef DEVICE_MANAGER_H
#define DEVICE_MANAGER_H

#include <Arduino.h>

/**
 * Runs the devices (sensors and actuators) described by the configuration the server publishes on
 * users/<userId>/controllers/<hardwareId>/configuration:
 *
 * {"v":"1a2b3c4d","devices":[{"id":12,"type":"TEMPERATURE","model":"DHT11","pin":16,"delay":5000,"min":0,"max":50}]}
 *
 * Nothing is hardcoded in the firmware: drivers are created for every (model, pin) pair from the
 * configuration and every device publishes its value to users/<userId>/devices/<id>/measurements.
 */
namespace DeviceManager {

// Replace the running configuration; an empty payload removes all devices.
bool applyConfiguration(const uint8_t *payload, unsigned int length);

// Version of the applied configuration, empty when none was received yet.
const String &configVersion();

// Apply a command (e.g. relay on/off) sent to users/<userId>/devices/<id>/command.
void handleCommand(uint32_t deviceId, float value);

// Poll drivers and publish values that are due; call from loop().
void loop();

// Draw the latest readings on the display.
void render();

size_t deviceCount();

} // namespace DeviceManager

#endif
