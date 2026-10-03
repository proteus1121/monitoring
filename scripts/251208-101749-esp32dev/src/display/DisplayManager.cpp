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
    _u8g2 = new U8G2_ST7565_NHD_C12864_F_4W_SW_SPI(U8G2_R2, U8G2_CLK_PIN, U8G2_DATA_PIN, U8G2_CS_PIN,
                                                   U8G2_DC_PIN, U8G2_RST_PIN);
    _u8g2->begin();
    _u8g2->setContrast(200);
    _u8g2->enableUTF8Print();
    _u8g2->setFontPosTop();
    _u8g2->setFontMode(1); // transparent text, so it can be drawn on inverted areas
    _initialized = true;
    Serial.println("[DISPLAY] U8G2 initialized successfully");
#else
    Wire.begin(DISPLAY_I2C_SDA, DISPLAY_I2C_SCL);
    if (!_display.begin(SSD1306_SWITCHCAPVCC, 0x3C) && !_display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
        Serial.println("[DISPLAY] SSD1306 not found at 0x3C or 0x3D, check I2C wiring");
        _initialized = false;
        return;
    }
    _display.cp437(true); // 0xF8 is the degree sign
    _display.setTextWrap(false);
    _display.clearDisplay();
    _initialized = true;
    Serial.println("[DISPLAY] SSD1306 initialized successfully");
#endif
}

bool DisplayManager::isInitialized() {
    return _initialized;
}

void DisplayManager::clear() {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->clearBuffer();
#else
    _display.clearDisplay();
#endif
}

void DisplayManager::show() {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->sendBuffer();
#else
    _display.display();
#endif
}

#ifdef USE_U8G2
void DisplayManager::setFont(Font font) {
    switch (font) {
    case SMALL:
        _u8g2->setFont(u8g2_font_5x7_tf);
        break;
    case NORMAL:
        _u8g2->setFont(u8g2_font_6x10_tf);
        break;
    case LARGE:
        _u8g2->setFont(u8g2_font_helvB12_tf);
        break;
    case HUGE:
        _u8g2->setFont(u8g2_font_logisoso16_tr);
        break;
    }
}
#else
static uint8_t textScale(DisplayManager::Font font) {
    return font == DisplayManager::LARGE || font == DisplayManager::HUGE ? 2 : 1;
}

// the built-in font is CP437: the UTF-8 degree sign becomes 0xF8
static String toCp437(const String &text) {
    String out = text;
    out.replace("\xC2\xB0", "\xF8");
    return out;
}
#endif

void DisplayManager::text(int x, int y, const String &text, Font font, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    setFont(font);
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawUTF8(x, y, text.c_str());
    _u8g2->setDrawColor(1);
#else
    _display.setTextSize(textScale(font));
    _display.setTextColor(on ? SSD1306_WHITE : SSD1306_BLACK);
    _display.setCursor(x, y);
    _display.print(toCp437(text));
#endif
}

void DisplayManager::textCentered(int y, const String &value, Font font, bool on) {
    text((SCREEN_WIDTH - textWidth(value, font)) / 2, y, value, font, on);
}

int DisplayManager::textWidth(const String &text, Font font) {
    if (!_initialized)
        return 0;
#ifdef USE_U8G2
    setFont(font);
    return _u8g2->getUTF8Width(text.c_str());
#else
    return toCp437(text).length() * 6 * textScale(font);
#endif
}

int DisplayManager::fontHeight(Font font) {
#ifdef USE_U8G2
    switch (font) {
    case SMALL:
        return 7;
    case NORMAL:
        return 9;
    case LARGE:
        return 12;
    default:
        return 16;
    }
#else
    return 7 * textScale(font);
#endif
}

void DisplayManager::box(int x, int y, int w, int h, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawBox(x, y, w, h);
    _u8g2->setDrawColor(1);
#else
    _display.fillRect(x, y, w, h, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::frame(int x, int y, int w, int h, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawFrame(x, y, w, h);
    _u8g2->setDrawColor(1);
#else
    _display.drawRect(x, y, w, h, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::roundFrame(int x, int y, int w, int h, int r, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawRFrame(x, y, w, h, r);
    _u8g2->setDrawColor(1);
#else
    _display.drawRoundRect(x, y, w, h, r, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::line(int x0, int y0, int x1, int y1, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawLine(x0, y0, x1, y1);
    _u8g2->setDrawColor(1);
#else
    _display.drawLine(x0, y0, x1, y1, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::pixel(int x, int y, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawPixel(x, y);
    _u8g2->setDrawColor(1);
#else
    _display.drawPixel(x, y, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::disc(int x, int y, int r, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawDisc(x, y, r);
    _u8g2->setDrawColor(1);
#else
    _display.fillCircle(x, y, r, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::circle(int x, int y, int r, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawCircle(x, y, r);
    _u8g2->setDrawColor(1);
#else
    _display.drawCircle(x, y, r, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}

void DisplayManager::triangle(int x0, int y0, int x1, int y1, int x2, int y2, bool on) {
    if (!_initialized)
        return;
#ifdef USE_U8G2
    _u8g2->setDrawColor(on ? 1 : 0);
    _u8g2->drawTriangle(x0, y0, x1, y1, x2, y2);
    _u8g2->setDrawColor(1);
#else
    _display.fillTriangle(x0, y0, x1, y1, x2, y2, on ? SSD1306_WHITE : SSD1306_BLACK);
#endif
}
