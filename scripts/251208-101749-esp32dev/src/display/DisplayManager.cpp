#include "DisplayManager.h"
#include <Wire.h>

DisplayManager oled;

// =========================
//  DisplayConfig
// =========================
DisplayConfig DisplayConfig::defaultFor() {
#if defined(ESP8266)
    // NodeMCU with the ST7565 module: CLK D5, DIN D6, CS D2, DC D7, RST D4, mounted upside down
    return DisplayConfig{ST7565, {14, 12, 4, 13, 2}, true};
#else
    // ESP32 DevKit with an SSD1306 on SDA 27 / SCL 14
    return DisplayConfig{SSD1306, {27, 14, 0, 0, 0}, false};
#endif
}

DisplayConfig::Model DisplayConfig::modelFromName(const String &name) {
    if (name == "ST7565")
        return ST7565;
    if (name == "SSD1306")
        return SSD1306;
    if (name == "SH1106")
        return SH1106;
    return NONE;
}

const char *DisplayConfig::modelName(Model model) {
    switch (model) {
    case ST7565:
        return "ST7565";
    case SSD1306:
        return "SSD1306";
    case SH1106:
        return "SH1106";
    default:
        return "NONE";
    }
}

uint8_t DisplayConfig::pinCount() const {
    switch (model) {
    case ST7565:
        return 5;
    case SSD1306:
    case SH1106:
        return 2;
    default:
        return 0;
    }
}

bool DisplayConfig::isI2c() const {
    return model == SSD1306 || model == SH1106;
}

bool DisplayConfig::operator==(const DisplayConfig &other) const {
    if (model != other.model || flip != other.flip)
        return false;
    for (uint8_t i = 0; i < pinCount(); i++) {
        if (pins[i] != other.pins[i])
            return false;
    }
    return true;
}

// =========================
//  DisplayManager
// =========================
// Line levels and every address that answers, logged when the display is not found
static void logI2cDiagnostics(uint8_t sda, uint8_t scl) {
    // an idle bus is HIGH through the module's pull-ups: LOW means no power, no pull-ups or a short
    pinMode(sda, INPUT);
    pinMode(scl, INPUT);
    delay(2);
    Serial.printf("[DISPLAY] Idle lines without internal pull-ups: SDA %s, SCL %s\n",
                  digitalRead(sda) ? "HIGH" : "LOW", digitalRead(scl) ? "HIGH" : "LOW");
    Wire.begin(sda, scl);
    String found;
    for (uint8_t address = 0x08; address < 0x78; address++) {
        Wire.beginTransmission(address);
        if (Wire.endTransmission() == 0)
            found += String(found.length() ? ", 0x" : "0x") + String(address, HEX);
    }
    Serial.println("[DISPLAY] I2C devices on these pins: " + (found.length() ? found : String("none")));
}

static int findI2cAddress(uint8_t sda, uint8_t scl) {
    Wire.begin(sda, scl);
    // the module may still be powering up right after a cold start
    for (int attempt = 0; attempt < 3; attempt++) {
        for (uint8_t address : {0x3C, 0x3D}) {
            Wire.beginTransmission(address);
            if (Wire.endTransmission() == 0)
                return address;
        }
        delay(50);
    }
    logI2cDiagnostics(sda, scl);
    return -1;
}

void DisplayManager::begin(const DisplayConfig &config) {
    _config = config;
    _initialized = false;
    const u8g2_cb_t *rotation = config.flip ? U8G2_R2 : U8G2_R0;
    const uint8_t *p = config.pins;

    switch (config.model) {
    case DisplayConfig::ST7565:
        // SPI has no answer to wait for: the module is driven blind
        _u8g2 = new U8G2_ST7565_NHD_C12864_F_4W_SW_SPI(rotation, p[0], p[1], p[2], p[3], p[4]);
        break;
    case DisplayConfig::SSD1306:
    case DisplayConfig::SH1106: {
        int address = findI2cAddress(p[0], p[1]);
        if (address < 0) {
            Serial.printf("[DISPLAY] %s not found on SDA %u / SCL %u, check wiring\n",
                          DisplayConfig::modelName(config.model), p[0], p[1]);
            return;
        }
        if (config.model == DisplayConfig::SSD1306)
            _u8g2 = new U8G2_SSD1306_128X64_NONAME_F_HW_I2C(rotation, U8X8_PIN_NONE, p[1], p[0]);
        else
            _u8g2 = new U8G2_SH1106_128X64_NONAME_F_HW_I2C(rotation, U8X8_PIN_NONE, p[1], p[0]);
        _u8g2->setI2CAddress(address * 2);
        Serial.printf("[DISPLAY] %s at 0x%02X on SDA %u / SCL %u\n", DisplayConfig::modelName(config.model), address,
                      p[0], p[1]);
        break;
    }
    default:
        Serial.println("[DISPLAY] No display configured");
        return;
    }

    _u8g2->begin();
    if (config.model == DisplayConfig::ST7565)
        _u8g2->setContrast(200);
    _u8g2->enableUTF8Print();
    _u8g2->setFontPosTop();
    _u8g2->setFontMode(1); // transparent text, so it can be drawn on inverted areas
    _initialized = true;
    Serial.printf("[DISPLAY] %s initialized\n", DisplayConfig::modelName(config.model));
}

bool DisplayManager::isInitialized() {
    return _initialized;
}

const DisplayConfig &DisplayManager::config() const {
    return _config;
}

bool DisplayManager::usesPin(uint8_t pin) const {
    for (uint8_t i = 0; i < _config.pinCount(); i++) {
        if (_config.pins[i] == pin)
            return true;
    }
    return false;
}

void DisplayManager::clear() {
    if (_initialized)
        _u8g2->clearBuffer();
}

void DisplayManager::show() {
    if (_initialized)
        _u8g2->sendBuffer();
}

// UTF-8 lead bytes of U+0400..U+04FF: Ukrainian letters, including Ґ (D2 90)
static bool hasCyrillic(const String &text) {
    for (size_t i = 0; i < text.length(); i++) {
        uint8_t c = (uint8_t)text[i];
        if (c >= 0xD0 && c <= 0xD3)
            return true;
    }
    return false;
}

void DisplayManager::setFont(Font font, const String &text) {
    bool cyrillic = hasCyrillic(text);
    switch (font) {
    case SMALL:
        _u8g2->setFont(cyrillic ? u8g2_font_5x7_t_cyrillic : u8g2_font_5x7_tf);
        break;
    case NORMAL:
        _u8g2->setFont(cyrillic ? u8g2_font_6x12_t_cyrillic : u8g2_font_6x10_tf);
        break;
    case LARGE:
    case HUGE:
        // one large Cyrillic font is enough: HUGE only shows "SSN"
        if (cyrillic)
            _u8g2->setFont(u8g2_font_9x15_t_cyrillic);
        else
            _u8g2->setFont(font == LARGE ? u8g2_font_helvB12_tf : u8g2_font_logisoso16_tr);
        break;
    }
}

void DisplayManager::color(bool on) {
    _u8g2->setDrawColor(on ? 1 : 0);
}

void DisplayManager::text(int x, int y, const String &text, Font font, bool on) {
    if (!_initialized)
        return;
    setFont(font, text);
    color(on);
    _u8g2->drawUTF8(x, y, text.c_str());
    color(true);
}

void DisplayManager::textCentered(int y, const String &value, Font font, bool on) {
    text((SCREEN_WIDTH - textWidth(value, font)) / 2, y, value, font, on);
}

int DisplayManager::textWidth(const String &text, Font font) {
    if (!_initialized)
        return 0;
    setFont(font, text);
    return _u8g2->getUTF8Width(text.c_str());
}

int DisplayManager::fontHeight(Font font) {
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
}

void DisplayManager::box(int x, int y, int w, int h, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
    color(on);
    _u8g2->drawBox(x, y, w, h);
    color(true);
}

void DisplayManager::frame(int x, int y, int w, int h, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
    color(on);
    _u8g2->drawFrame(x, y, w, h);
    color(true);
}

void DisplayManager::roundFrame(int x, int y, int w, int h, int r, bool on) {
    if (!_initialized || w <= 0 || h <= 0)
        return;
    color(on);
    _u8g2->drawRFrame(x, y, w, h, r);
    color(true);
}

void DisplayManager::line(int x0, int y0, int x1, int y1, bool on) {
    if (!_initialized)
        return;
    color(on);
    _u8g2->drawLine(x0, y0, x1, y1);
    color(true);
}

void DisplayManager::pixel(int x, int y, bool on) {
    if (!_initialized)
        return;
    color(on);
    _u8g2->drawPixel(x, y);
    color(true);
}

void DisplayManager::disc(int x, int y, int r, bool on) {
    if (!_initialized)
        return;
    color(on);
    _u8g2->drawDisc(x, y, r);
    color(true);
}

void DisplayManager::circle(int x, int y, int r, bool on) {
    if (!_initialized)
        return;
    color(on);
    _u8g2->drawCircle(x, y, r);
    color(true);
}

void DisplayManager::triangle(int x0, int y0, int x1, int y1, int x2, int y2, bool on) {
    if (!_initialized)
        return;
    color(on);
    _u8g2->drawTriangle(x0, y0, x1, y1, x2, y2);
    color(true);
}
