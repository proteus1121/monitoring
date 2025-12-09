#include <Arduino.h>
#include <Adafruit_SSD1306.h>

// Define your OLED size
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

class DisplayManager {
public:
    DisplayManager();
    void begin();
    void clear();
    void printLine(int line, const String &text);
    void show();

private:
    Adafruit_SSD1306 _display;
};

extern DisplayManager oled;