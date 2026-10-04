#pragma once
#include <Arduino.h>
#include <U8g2lib.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

/**
 * Display wired to the board, configured on the site and kept in flash (Storage) so the screen works from
 * power-on. Without a saved one the board uses the display it shipped with, see defaultFor().
 */
struct DisplayConfig {
    enum Model : uint8_t { NONE = 0, ST7565 = 1, SSD1306 = 2, SH1106 = 3 };

    Model model;
    // ST7565: CLK, DIN, CS, DC, RST; SSD1306 / SH1106: SDA, SCL
    uint8_t pins[5];
    // rotate by 180 degrees
    bool flip;

    static DisplayConfig defaultFor();
    // "ST7565", "SSD1306", ... as the server sends it; NONE for anything unknown
    static Model modelFromName(const String &name);
    static const char *modelName(Model model);
    uint8_t pinCount() const;
    bool isI2c() const;
    bool operator==(const DisplayConfig &other) const;
};

/**
 * Drawing primitives over U8g2, the same for every supported display. Coordinates are pixels, text is
 * positioned by its top-left corner; `on` = lit pixel, false draws in background color (used on inverted
 * areas). The screens themselves are in Screens.h.
 */
class DisplayManager {
public:
    enum Font { SMALL, NORMAL, LARGE, HUGE };

    void begin(const DisplayConfig &config);
    // display answered (I2C) or is driven blind (SPI); false without a display
    bool isInitialized();
    const DisplayConfig &config() const;

    // pin taken by the display; an I2C display lets a BMP180 share its bus pins
    bool usesPin(uint8_t pin) const;

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
    // the Cyrillic variant for text with Cyrillic letters: those fonts have no "°", the others no Cyrillic
    void setFont(Font font, const String &text);
    void color(bool on);

    bool _initialized = false;
    DisplayConfig _config{DisplayConfig::NONE, {0, 0, 0, 0, 0}, false};
    U8G2 *_u8g2 = nullptr;
};

extern DisplayManager oled;
