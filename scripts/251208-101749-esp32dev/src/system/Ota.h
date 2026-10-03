#ifndef OTA_H
#define OTA_H

/**
 * Firmware updates over Wi-Fi (ArduinoOTA), so a board does not need USB - which a sensor on RX blocks.
 *
 * The password comes from secrets.ini at build time (see platformio.ini); without one OTA stays off.
 * Upload: pio run -e esp8266-ota -t upload (or esp32dev-ota).
 */
namespace Ota {

// call from loop(); starts listening once the board is on Wi-Fi
void loop();

// true while an update is being received
bool inProgress();

} // namespace Ota

#endif
