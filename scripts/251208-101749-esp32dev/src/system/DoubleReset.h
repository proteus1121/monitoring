#ifndef DOUBLE_RESET_H
#define DOUBLE_RESET_H

/**
 * Pressing RST twice opens the setup page: the second press has to come while the splash screen is shown.
 *
 * At boot a flag is set; if the board is reset again before finish() clears it, the next boot finds the flag.
 * ESP8266 keeps the flag in RTC memory (survives the RST button), ESP32 in NVS because its EN button
 * resets the RTC domain too.
 */
namespace DoubleReset {

// call once early in setup(); true when this boot is the second reset in a row
bool detect();

// ends the detection window; called after the splash, before the slow Wi-Fi connection
void finish();

} // namespace DoubleReset

#endif
