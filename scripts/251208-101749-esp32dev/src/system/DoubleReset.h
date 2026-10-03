#ifndef DOUBLE_RESET_H
#define DOUBLE_RESET_H

/**
 * Pressing RST twice within a few seconds opens the setup page.
 *
 * At boot a flag is set; if the board is reset again before loop() clears it, the next boot finds the flag.
 * ESP8266 keeps the flag in RTC memory (survives the RST button), ESP32 in NVS because its EN button
 * resets the RTC domain too.
 */
namespace DoubleReset {

// call once early in setup(); true when this boot is the second reset in a row
bool detect();

// call from loop(); clears the flag once the detection window is over
void loop();

} // namespace DoubleReset

#endif
