#include "DisplayManager.h"

DisplayManager oled;

DisplayManager::DisplayManager()
#ifdef USE_U8G2
    : _u8g2(nullptr)
#else
    : _display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire)
#endif
{
}

void DisplayManager::begin() {
#ifdef USE_U8G2
    // instantiate with configured pins
    _u8g2 = new U8G2_ST7565_NHD_C12864_F_4W_SW_SPI(
        U8G2_R2,
        U8G2_CLK_PIN,
        U8G2_DATA_PIN,
        U8G2_CS_PIN,
        U8G2_DC_PIN,
        U8G2_RST_PIN);
    _u8g2->begin();
    _u8g2->setContrast(200);
    _u8g2->enableUTF8Print();

    // show a simple splash screen like the snippet
    _u8g2->clearBuffer();
    _u8g2->setFont(u8g2_font_guildenstern_nbp_t_all);
    _u8g2->drawStr(10, 20, "Env Monitor v2.0");
    _u8g2->drawStr(10, 40, "Initializing...");
    _u8g2->sendBuffer();
    delay(2000);
    _initialized = true;
    Serial.println("[DISPLAY] U8G2 initialized successfully");
#else
    // Try to initialize SSD1306 at address 0x3C
    Serial.println("[DISPLAY] Attempting to initialize SSD1306...");
    if (!_display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { // 0x3C is common
        Serial.println("[DISPLAY] SSD1306 at 0x3C failed, trying 0x3D...");
        // Retry with alternative address
        if (!_display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
            Serial.println("[DISPLAY] ERROR: SSD1306 not found at either 0x3C or 0x3D!");
            Serial.println("[DISPLAY] Display will be disabled. Check I2C wiring and address.");
            _initialized = false;
            return;
        }
    }
    _display.clearDisplay();
    _display.setTextSize(1);
    _display.setTextColor(SSD1306_WHITE);
    _display.setCursor(0, 0);
    _display.println("Initializing...");
    _display.display();
    delay(2000);
    _initialized = true;
    Serial.println("[DISPLAY] SSD1306 initialized successfully");
#endif
}

bool DisplayManager::isInitialized() {
    return _initialized;
}

void DisplayManager::clear() {
    if (!_initialized) {
        Serial.println("[DISPLAY] clear() called but not initialized");
        return;
    }
#ifdef USE_U8G2
    if (_u8g2)
        _u8g2->clearBuffer();
#else
    _display.clearDisplay();
#endif
}

void DisplayManager::printLine(int line, const String &text) {
    if (!_initialized) {
        Serial.println("[DISPLAY] printLine() called but not initialized");
        return;
    }
#ifdef USE_U8G2
    if (_u8g2) {
        // approximate 10px line height
        int y = 10 + line * 10;
        _u8g2->setFont(u8g2_font_guildenstern_nbp_t_all);
        _u8g2->drawStr(0, y, text.c_str());
    }
#else
    _display.setCursor(0, line * 10); // 10 px per line
    _display.println(text);
#endif
}

void DisplayManager::show() {
    if (!_initialized) {
        Serial.println("[DISPLAY] show() called but not initialized");
        return;
    }
#ifdef USE_U8G2
    if (_u8g2)
        _u8g2->sendBuffer();
#else
    _display.display();
#endif
}

#ifdef USE_U8G2
U8G2_ST7565_NHD_C12864_F_4W_SW_SPI *DisplayManager::getU8g2() {
    return _u8g2;
}
#endif
