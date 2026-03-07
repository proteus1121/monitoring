#include <Arduino.h>

// if building for ESP8266 we expect to use the U8g2 library; enabling this
// macro will pull in the header and switch DisplayManager to the U8g2 backend.
#if defined(ESP8266)
#define USE_U8G2
#endif

#ifdef USE_U8G2
#include <U8g2lib.h>
// default pin assignments for the 4-wire SPI ST7565 display mentioned in the
// sketch snippet. The user may override any of these by defining them before
// including DisplayManager.h in their own code.
#ifndef U8G2_CLK_PIN
#define U8G2_CLK_PIN D5
#endif
#ifndef U8G2_DATA_PIN
#define U8G2_DATA_PIN D6
#endif
#ifndef U8G2_CS_PIN
#define U8G2_CS_PIN D2
#endif
#ifndef U8G2_DC_PIN
#define U8G2_DC_PIN D7
#endif
#ifndef U8G2_RST_PIN
#define U8G2_RST_PIN D4
#endif
#else
#include <Adafruit_SSD1306.h>
#endif

// Define your OLED size (only used for the SSD1306 backend)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

class DisplayManager {
public:
    DisplayManager();
    void begin();
    void clear();
    void printLine(int line, const String &text);
    void show();
    bool isInitialized(); // check if display was successfully initialized

#ifdef USE_U8G2
    // expose the underlying object so callers can use advanced features
    U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *getU8g2();
#endif

private:
    bool _initialized = false; // track initialization success
#ifdef USE_U8G2
    // display object is allocated in begin() because the constructor requires
    // pin parameters that may be specified via macros.
    U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *_u8g2 = nullptr;
#else
    Adafruit_SSD1306 _display;
#endif
};

extern DisplayManager oled;