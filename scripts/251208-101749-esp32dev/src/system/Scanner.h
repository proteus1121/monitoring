#ifndef SCANNER_H
#define SCANNER_H

#include <Arduino.h>

/**
 * "Scan board" from the site: looks for modules on the free pins and reports them, so the site can offer
 * them as devices.
 *
 * Only pins that no device, the display, the BOOT / FLASH button or the serial port use are touched, and
 * nothing is driven for longer than a DHT start pulse (20 ms). Per pin:
 *  - a few microseconds LOW and HIGH tell a floating pin from one a module pulls up or drives;
 *  - pairs of pulled-up pins are tried as I2C SDA / SCL and the answering addresses identified
 *    (BMP180 by its chip id, OLED displays, BMP280 / BME280 / BH1750 as not supported yet);
 *  - the rest is tried as a DHT11 / DHT22 data line, with a reading;
 *  - whatever still pulls or drives the pin is reported as a digital signal, ADC pins with their value.
 *
 * Request:  users/<userId>/controllers/<hardwareId>/scan         {"id":"..."}
 * Result:   users/<userId>/controllers/<hardwareId>/scan-result  {"id":"...","pins":[...],"found":[...]}
 *   found: {"k":"dht","m":"DHT11","p":[16],"t":27.3,"h":49}
 *          {"k":"bmp180","p":[4,14],"t":24.1,"pr":1012.6}
 *          {"k":"i2c","p":[4,14],"a":60,"n":"oled"}      n: oled, bmp280, bme280, bh1750 or absent
 *          {"k":"digital","p":[5],"l":0}
 *          {"k":"analog","p":[17],"v":512}
 */
namespace Scanner {

// remembered and run from loop(): the scan takes a moment and publishes its result itself
void request(const String &id);

void loop();

} // namespace Scanner

#endif
