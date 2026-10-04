#include "Texts.h"
#include "../storage/Storage.h"

namespace {

#define TEXT_STRINGS(id, en, uk)                                                                                       \
    const char id##_EN[] PROGMEM = en;                                                                                 \
    const char id##_UK[] PROGMEM = uk;
DISPLAY_TEXTS(TEXT_STRINGS)
#undef TEXT_STRINGS

// pointers to the flash strings, in the order of Texts::Id
#define TEXT_EN(id, en, uk) id##_EN,
const char *const EN_TEXTS[] = {DISPLAY_TEXTS(TEXT_EN)};
#undef TEXT_EN
#define TEXT_UK(id, en, uk) id##_UK,
const char *const UK_TEXTS[] = {DISPLAY_TEXTS(TEXT_UK)};
#undef TEXT_UK

Texts::Lang current = Texts::UK;

} // namespace

namespace Texts {

void begin() {
    current = Storage::loadDisplayLanguage() == EN ? EN : UK;
}

Lang language() {
    return current;
}

bool setLanguage(const String &code) {
    Lang next;
    if (code.equalsIgnoreCase("UK"))
        next = UK;
    else if (code.equalsIgnoreCase("EN"))
        next = EN;
    else
        return false;
    if (next == current)
        return false;
    current = next;
    Storage::saveDisplayLanguage(next);
    Serial.printf("[DISPLAY] Language %s\n", next == UK ? "UK" : "EN");
    return true;
}

} // namespace Texts

String tr(Texts::Id id) {
    if (id >= Texts::COUNT)
        return String();
    return String(FPSTR(current == Texts::UK ? UK_TEXTS[id] : EN_TEXTS[id]));
}
