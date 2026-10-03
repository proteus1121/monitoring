#include "Screens.h"
#include "../network/mqtt/MQTTHandler.h"
#include "DisplayManager.h"
#include <math.h>

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif

namespace {

const int BAR_HEIGHT = 11;
const int TILES_PER_PAGE = 4;

// counts presses, wrapped to the number of pages when drawing
unsigned int pageCounter = 0;

/**
 * The site logo: a camera aperture. A disc with a hexagonal opening whose edges run on to the rim as the
 * six blades. `on` = color of the disc.
 */
void aperture(int cx, int cy, int r, float angleDeg, bool on = true) {
    oled.disc(cx, cy, r, on);
    float ri = r * 0.42f;
    float vx[6], vy[6];
    for (int i = 0; i < 6; i++) {
        float a = (angleDeg + i * 60) * (float)M_PI / 180.0f;
        vx[i] = cx + ri * cosf(a);
        vy[i] = cy + ri * sinf(a);
    }
    for (int i = 0; i < 6; i++) {
        int j = (i + 1) % 6;
        oled.triangle(cx, cy, lroundf(vx[i]), lroundf(vy[i]), lroundf(vx[j]), lroundf(vy[j]), !on);
    }
    if (r < 8)
        return; // too small for blade edges
    for (int i = 0; i < 6; i++) {
        int prev = (i + 5) % 6;
        float dx = vx[i] - vx[prev], dy = vy[i] - vy[prev];
        float len = sqrtf(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        // continue the hexagon edge until it meets the rim
        float px = vx[i] - cx, py = vy[i] - cy;
        float b = dx * px + dy * py;
        float c = px * px + py * py - (float)(r * r);
        float t = -b + sqrtf(b * b - c);
        oled.line(lroundf(vx[i]), lroundf(vy[i]), lroundf(vx[i] + dx * t), lroundf(vy[i] + dy * t), !on);
    }
}

int wifiLevel() {
    if (WiFi.status() != WL_CONNECTED)
        return -1;
    long rssi = WiFi.RSSI();
    if (rssi > -55)
        return 4;
    if (rssi > -65)
        return 3;
    if (rssi > -75)
        return 2;
    if (rssi > -85)
        return 1;
    return 0;
}

/**
 * Inverted bar: logo and title on the left, server link (filled dot = connected) and Wi-Fi bars on the right.
 * `accessPoint` shows "AP" instead of the bars while the board runs its own network.
 */
void statusBar(const String &title, bool accessPoint = false) {
    oled.box(0, 0, SCREEN_WIDTH, BAR_HEIGHT);
    aperture(6, 5, 4, 0, false);
    oled.text(13, 2, title, DisplayManager::SMALL, false);

    if (accessPoint) {
        oled.text(SCREEN_WIDTH - oled.textWidth("AP", DisplayManager::SMALL) - 2, 2, "AP", DisplayManager::SMALL, false);
        return;
    }
    int level = wifiLevel();
    for (int i = 0; i < 4; i++) {
        int h = 2 + i * 2;
        int x = 115 + i * 3;
        if (level > i) {
            oled.box(x, 9 - h, 2, h, false);
        } else {
            oled.pixel(x, 8, false);
            oled.pixel(x + 1, 8, false);
        }
    }
    if (level < 0) {
        // no Wi-Fi: cross over the bars
        oled.line(115, 1, 125, 9, false);
    }
    if (mqttConnected()) {
        oled.disc(108, 5, 2, false);
    } else {
        oled.circle(108, 5, 2, false);
    }
}

String fitted(const String &text, DisplayManager::Font font, int width) {
    if (oled.textWidth(text, font) <= width)
        return text;
    String out = text;
    while (out.length() > 1 && oled.textWidth(out + "..", font) > width)
        out.remove(out.length() - 1);
    return out + "..";
}

void tile(const Screens::Tile &t, int x, int y, int w, int h) {
    bool on = !t.alert;
    if (t.alert)
        oled.box(x, y, w, h);
    oled.text(x + 3, y + 2, fitted(t.label, DisplayManager::SMALL, w - 6), DisplayManager::SMALL, on);

    // the value as large as fits, the unit after it in small type on the same baseline
    DisplayManager::Font font = DisplayManager::LARGE;
    int unitWidth = t.unit.length() ? oled.textWidth(t.unit, DisplayManager::SMALL) + 2 : 0;
    if (oled.textWidth(t.value, font) + unitWidth > w - 6)
        font = DisplayManager::NORMAL;
    int valueY = y + h - oled.fontHeight(font) - 2;
    oled.text(x + 3, valueY, t.value, font, on);
    if (unitWidth) {
        int unitX = x + 3 + oled.textWidth(t.value, font) + 2;
        oled.text(unitX, valueY + oled.fontHeight(font) - oled.fontHeight(DisplayManager::SMALL), t.unit,
                  DisplayManager::SMALL, on);
    }
}

void dottedHorizontal(int x0, int x1, int y) {
    for (int x = x0; x <= x1; x += 2)
        oled.pixel(x, y);
}

void dottedVertical(int x, int y0, int y1) {
    for (int y = y0; y <= y1; y += 2)
        oled.pixel(x, y);
}

} // namespace

namespace Screens {

void splash(const char *version) {
    if (!oled.isInitialized())
        return;
    // one blade turn: the aperture looks the same again after 60 degrees
    for (int frame = 0; frame <= 20; frame++) {
        oled.clear();
        aperture(26, 32, 22, frame * 3.0f);
        oled.text(58, 8, "SSN", DisplayManager::HUGE);
        oled.text(58, 29, "Smart Sensor", DisplayManager::SMALL);
        oled.text(58, 38, "Network", DisplayManager::SMALL);
        // grows with the animation
        oled.line(58, 49, 58 + frame * 3, 49);
        oled.text(58, 54, String("firmware ") + version, DisplayManager::SMALL);
        oled.show();
        delay(45);
    }
    delay(600);
}

void connecting(const String &ssid) {
    if (!oled.isInitialized())
        return;
    oled.clear();
    statusBar("SSN");
    if (ssid.length() == 0) {
        oled.textCentered(20, "No Wi-Fi saved");
        oled.textCentered(36, "Opening setup", DisplayManager::SMALL);
    } else {
        oled.textCentered(17, "Connecting to", DisplayManager::SMALL);
        String name = fitted(ssid, DisplayManager::LARGE, SCREEN_WIDTH - 4);
        oled.textCentered(28, name, DisplayManager::LARGE);
        oled.textCentered(52, "please wait", DisplayManager::SMALL);
    }
    oled.show();
}

void setupMode(const String &ssid, const String &pass, const String &ip) {
    if (!oled.isInitialized())
        return;
    oled.clear();
    statusBar("Setup", true);
    oled.text(2, 14, "1. Join Wi-Fi", DisplayManager::SMALL);
    oled.text(8, 22, fitted(ssid, DisplayManager::NORMAL, 118), DisplayManager::NORMAL);
    oled.text(8, 33, "pass " + pass, DisplayManager::SMALL);
    oled.text(2, 44, "2. Open in a browser", DisplayManager::SMALL);
    oled.text(8, 53, "http://" + ip, DisplayManager::NORMAL);
    oled.show();
}

void pairing(const String &code, const char *site) {
    if (!oled.isInitialized())
        return;
    oled.clear();
    statusBar("Link to account");
    oled.textCentered(14, "Enter the code at", DisplayManager::SMALL);
    oled.textCentered(23, String(site) + "/pair", DisplayManager::NORMAL);
    oled.roundFrame(14, 36, 100, 26, 4);
    if (code.length()) {
        oled.textCentered(41, code, DisplayManager::HUGE);
    } else {
        String dots = String("...").substring(0, (millis() / 500) % 4);
        oled.text(30, 44, "Getting code" + dots, DisplayManager::SMALL);
    }
    oled.show();
}

void waitingForDevices(const char *site, const String &hardwareId) {
    if (!oled.isInitialized())
        return;
    oled.clear();
    statusBar("SSN");
    oled.textCentered(17, "No devices yet", DisplayManager::NORMAL);
    oled.textCentered(31, "Add them on", DisplayManager::SMALL);
    oled.textCentered(40, site, DisplayManager::NORMAL);
    oled.textCentered(55, hardwareId, DisplayManager::SMALL);
    oled.show();
}

void devices(const std::vector<Tile> &tiles) {
    if (!oled.isInitialized())
        return;
    int count = tiles.size();
    int pages = (count + TILES_PER_PAGE - 1) / TILES_PER_PAGE;
    int page = pages > 1 ? pageCounter % pages : 0;

    oled.clear();
    statusBar("SSN");
    // page dots in the middle of the bar
    if (pages > 1) {
        int x0 = SCREEN_WIDTH / 2 - pages * 3;
        for (int p = 0; p < pages; p++) {
            if (p == page) {
                oled.box(x0 + p * 6, 4, 3, 3, false);
            } else {
                oled.pixel(x0 + p * 6 + 1, 5, false);
            }
        }
    }

    const int top = BAR_HEIGHT + 1;
    const int rowHeight = (SCREEN_HEIGHT - top) / 2;
    // up to two readings use the full width
    bool wide = count <= 2;
    int first = page * TILES_PER_PAGE;
    int onPage = min(TILES_PER_PAGE, count - first);

    for (int i = 0; i < onPage; i++) {
        int col = wide ? 0 : i % 2;
        int row = wide ? i : i / 2;
        int w = wide ? SCREEN_WIDTH : SCREEN_WIDTH / 2 - 1;
        tile(tiles[first + i], col * (SCREEN_WIDTH / 2 + 1), top + row * rowHeight, w, rowHeight - 1);
    }
    if (onPage > 1)
        dottedHorizontal(0, SCREEN_WIDTH - 1, top + rowHeight - 1);
    if (!wide)
        dottedVertical(SCREEN_WIDTH / 2, top, SCREEN_HEIGHT - 1);
    oled.show();
}

void nextPage() {
    pageCounter++;
}

void ota(int percent, const char *state) {
    if (!oled.isInitialized())
        return;
    percent = constrain(percent, 0, 100);
    oled.clear();
    statusBar("Update");
    oled.textCentered(16, "Updating firmware", DisplayManager::NORMAL);
    oled.roundFrame(10, 30, 108, 11, 3);
    oled.box(12, 32, 104 * percent / 100, 7);
    oled.textCentered(44, state, DisplayManager::SMALL);
    oled.textCentered(55, "Do not power off", DisplayManager::SMALL);
    oled.show();
}

} // namespace Screens
