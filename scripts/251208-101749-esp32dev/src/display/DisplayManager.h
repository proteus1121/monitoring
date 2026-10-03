#pragma once
#include <Arduino.h>

// ESP8266 boards use an ST7565 over SPI through U8g2, ESP32 boards an SSD1306 over I2C through Adafruit
#if defined(ESP8266)
#define USE_U8G2
#endif

#ifdef USE_U8G2
#include <U8g2lib.h>
// 4-wire SPI ST7565; any pin may be overridden by defining it before including this header
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
// I2C bus of the SSD1306; a BMP180 can share it
#ifndef DISPLAY_I2C_SDA
#define DISPLAY_I2C_SDA 27
#endif
#ifndef DISPLAY_I2C_SCL
#define DISPLAY_I2C_SCL 14
#endif
#endif

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

/**
 * Drawing primitives shared by both display backends. Coordinates are pixels, text is positioned by its
 * top-left corner. `on` = lit pixel, false draws in background color (used on inverted areas).
 * The screens themselves are in Screens.h.
 */
class DisplayManager {
public:
    enum Font { SMALL, NORMAL, LARGE, HUGE };

    DisplayManager();
    void begin();
    bool isInitialized();

    void clear();
    void show();

    void text(int x, int y, const String &text, Font font = NORMAL, bool on = true);
    void textCentered(int y, const String &text, Font font = NORMAL, bool on = true);
    int textWidth(const String &text, Font font);
    int fontHeight(Font font);

    void box(int x, int y, int w, int h, bool on = true);
    void frame(int x, int y, int w, int h, bool on = true);
    void roundFrame(int x, int y, int w, int h, int r, bool on = true);
    void line(int x0, int y0, int x1, int y1, bool on = true);
    void pixel(int x, int y, bool on = true);
    void disc(int x, int y, int r, bool on = true);
    void circle(int x, int y, int r, bool on = true);
    void triangle(int x0, int y0, int x1, int y1, int x2, int y2, bool on = true);

private:
    bool _initialized = false;
#ifdef USE_U8G2
    void setFont(Font font);
    U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *_u8g2 = nullptr;
#else
    Adafruit_SSD1306 _display;
#endif
};

extern DisplayManager oled;
