#ifndef MONITORING_SENSORS_H
#define MONITORING_SENSORS_H

#include <stdint.h>

// sentinel value indicating "no pin assigned"; when passed to initSensors
// the corresponding sensor is simply skipped.
static const uint8_t NO_PIN = 0xFF;

// Defaults vary by platform; the caller (typically the .ino file) can
// override them by passing explicit values to initSensors().  Some platforms
// may not include every sensor type, so defaults for those entries are
// intentionally set to NO_PIN.
#if defined(ESP32)
static const uint8_t DEFAULT_PIN_DHT = 26;
static const uint8_t DEFAULT_PIN_MQ2 = 35;
static const uint8_t DEFAULT_PIN_LIGHT = 32;
static const uint8_t DEFAULT_PIN_IR = 33;
static const uint8_t DEFAULT_PIN_PIR = 13;
static const uint8_t DEFAULT_I2C_SDA = 14;
static const uint8_t DEFAULT_I2C_SCL = 27;
#elif defined(ESP8266)
// common NodeMCU pin assignments; adjust as needed in the sketch
static const uint8_t DEFAULT_PIN_DHT = 14;     // D5
static const uint8_t DEFAULT_PIN_MQ2 = 17;     // A0
static const uint8_t DEFAULT_PIN_LIGHT = 12;   // D6
static const uint8_t DEFAULT_PIN_IR = 13;      // D7
static const uint8_t DEFAULT_PIN_PIR = NO_PIN; // disabled by default
static const uint8_t DEFAULT_I2C_SDA = NO_PIN; // disabled by default
static const uint8_t DEFAULT_I2C_SCL = NO_PIN;
#else
#warning "Platform not recognised, please supply pin numbers explicitly."
static const uint8_t DEFAULT_PIN_DHT = NO_PIN;
static const uint8_t DEFAULT_PIN_MQ2 = NO_PIN;
static const uint8_t DEFAULT_PIN_LIGHT = NO_PIN;
static const uint8_t DEFAULT_PIN_IR = NO_PIN;
static const uint8_t DEFAULT_PIN_PIR = NO_PIN;
static const uint8_t DEFAULT_I2C_SDA = NO_PIN;
static const uint8_t DEFAULT_I2C_SCL = NO_PIN;
#endif

/**
 * Initialize all sensors.  All pin numbers are optional; when omitted the
 * platform-specific default constants above are used.  The two I2C pins are
 * only required if the BMP180 (or any other I2C device) is present.
 */
void initSensors(uint8_t pinDht = DEFAULT_PIN_DHT,
                 uint8_t pinMq2 = DEFAULT_PIN_MQ2,
                 uint8_t pinLight = DEFAULT_PIN_LIGHT,
                 uint8_t pinIr = DEFAULT_PIN_IR,
                 uint8_t pinPir = DEFAULT_PIN_PIR,
                 uint8_t i2cSda = DEFAULT_I2C_SDA,
                 uint8_t i2cScl = DEFAULT_I2C_SCL);

void readAllSensors();
void publishPendingToMQTT();

#endif
