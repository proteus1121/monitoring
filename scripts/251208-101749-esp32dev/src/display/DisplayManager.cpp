#include "DisplayManager.h"

DisplayManager oled;

DisplayManager::DisplayManager() 
    : _display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire) {}

void DisplayManager::begin() {
    if (!_display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { // 0x3C is common
        Serial.println("SSD1306 allocation failed");
        for(;;);
    }
    _display.clearDisplay();
    _display.setTextSize(1);
    _display.setTextColor(SSD1306_WHITE);
    _display.setCursor(0,0);
    _display.display();
}

void DisplayManager::clear() {
    _display.clearDisplay();
}

void DisplayManager::printLine(int line, const String &text) {
    _display.setCursor(0, line * 10); // 10 px per line
    _display.println(text);
}

void DisplayManager::show() {
    _display.display();
}
