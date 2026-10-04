#include "FirmwareUpdate.h"
#include "../display/Screens.h"
#include "../display/Texts.h"
#include "../network/mqtt/MQTTHandler.h"
#include "../network/setup-server/ServerManager.h"
#include "TrustedRoots.h"
#include <time.h>

#if defined(ESP8266)
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <Updater.h>
#include <WiFiClientSecureBearSSL.h>
#include <umm_malloc/umm_heap_select.h>
#else
#include <HTTPClient.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#endif

namespace {

bool pending = false;
bool running = false;
// downloading right after a restart: MQTT is not up yet, nothing to report to
bool atBoot = false;
String pendingUrl;
String pendingMd5;
String pendingVersion;

bool report(const char *state, int progress, const String &error = "") {
    String payload = String("{\"state\":\"") + state + "\",\"progress\":" + progress + ",\"version\":\"" +
                     pendingVersion + "\"";
    if (error.length()) {
        String escaped = error;
        escaped.replace("\"", "'");
        payload += ",\"error\":\"" + escaped + "\"";
    }
    payload += "}";
    Serial.println("[UPDATE] " + payload);
    return !atBoot && publishUpdateStatus(payload);
}

#if defined(ESP8266)
// TLS needs about 30 kB, more than an ESP8266 has left once the display, sensors and MQTT run. The update is
// kept in RTC memory, which survives a restart, and downloaded at the next boot before they start. eboot keeps
// its copy command in the first 128 bytes of the user RTC memory (Esp.cpp), the record goes after them.
const uint32_t RECORD_BLOCK = 128 / 4;
const uint32_t RECORD_MAGIC = 0x46575550; // "FWUP"
const uint32_t STATE_PENDING = 1;
const uint32_t STATE_FAILED = 2;

struct Record {
    uint32_t magic;
    uint32_t state;
    char url[128];
    char md5[36];
    char version[16];
    char error[64];
};
static_assert(RECORD_BLOCK * 4 + sizeof(Record) <= 512 && sizeof(Record) % 4 == 0, "RTC record does not fit");

bool loadRecord(Record &record) {
    return ESP.rtcUserMemoryRead(RECORD_BLOCK, (uint32_t *)&record, sizeof(record)) && record.magic == RECORD_MAGIC;
}

void saveRecord(uint32_t state, const String &error = "") {
    Record record = {};
    record.magic = RECORD_MAGIC;
    record.state = state;
    strlcpy(record.url, pendingUrl.c_str(), sizeof(record.url));
    strlcpy(record.md5, pendingMd5.c_str(), sizeof(record.md5));
    strlcpy(record.version, pendingVersion.c_str(), sizeof(record.version));
    strlcpy(record.error, error.c_str(), sizeof(record.error));
    ESP.rtcUserMemoryWrite(RECORD_BLOCK, (uint32_t *)&record, sizeof(record));
}

void clearRecord() {
    Record record = {};
    ESP.rtcUserMemoryWrite(RECORD_BLOCK, (uint32_t *)&record, sizeof(record));
}

// a failed download at boot is reported once MQTT is connected
bool failureToReport = false;
String failure;
#endif

// certificates are only valid with the real date
bool syncClock() {
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    unsigned long started = millis();
    while (time(nullptr) < 1700000000) {
        if (millis() - started > 15000)
            return false;
        delay(200);
    }
    return true;
}

String run() {
    if (!pendingUrl.startsWith("https://"))
        return "only https downloads are accepted";
    if (pendingMd5.length() != 32)
        return "missing MD5";
    if (!syncClock())
        return "could not get the time to check the certificate";

    Screens::ota(0, tr(Texts::OTA_CONNECTING));
    String pem = FPSTR(TRUSTED_ROOTS_PEM);
#if defined(ESP8266)
    BearSSL::X509List roots(pem.c_str());
    BearSSL::WiFiClientSecure client;
    client.setTrustAnchors(&roots);
    client.setBufferSizes(16384, 512);
    uint32_t iramFree;
    {
        HeapSelectIram iram;
        iramFree = ESP.getFreeHeap();
    }
    Serial.printf("[UPDATE] Free heap before download: %u, IRAM heap %u\n", ESP.getFreeHeap(), iramFree);
    // the handshake checks three RSA-4096 signatures and does ECDHE without yielding: at 80 MHz that is longer
    // than the software watchdog allows. The board restarts after the download, or runAtBoot() sets it back.
    system_update_cpu_freq(SYS_CPU_160MHZ);
#else
    WiFiClientSecure client;
    client.setCACert(pem.c_str());
#endif

    HTTPClient http;
    http.setTimeout(15000);
    if (!http.begin(client, pendingUrl))
        return "bad URL";
    int status = http.GET();
    if (status != 200) {
        http.end();
        if (status >= 0)
            return "server answered " + String(status);
        // "connection failed" hides why: the TLS error says if it was the certificate, memory or the network
        String error = "download failed: " + http.errorToString(status);
        char reason[96] = {0};
#if defined(ESP8266)
        int code = client.getLastSSLError(reason, sizeof(reason));
        error += " (TLS " + String(code) + ": " + reason + ", free heap " + String(ESP.getFreeHeap()) + ")";
#else
        int code = client.lastError(reason, sizeof(reason));
        error += " (TLS " + String(code) + ": " + reason + ")";
#endif
        return error;
    }
    int size = http.getSize();
    if (size <= 0) {
        http.end();
        return "unknown file size";
    }
    if (!Update.begin(size)) {
        http.end();
        return "not enough space for the update";
    }
    Update.setMD5(pendingMd5.c_str());

    WiFiClient *stream = http.getStreamPtr();
    uint8_t buffer[1024];
    int written = 0;
    int lastPercent = -1;
    unsigned long lastData = millis();
    while (written < size) {
        size_t available = stream->available();
        if (!available) {
            if (!http.connected() || millis() - lastData > 15000)
                break;
            delay(1);
            continue;
        }
        int read = stream->readBytes(buffer, min(available, sizeof(buffer)));
        if (read <= 0)
            break;
        if (Update.write(buffer, read) != (size_t)read)
            break;
        written += read;
        lastData = millis();
        int percent = (int)((int64_t)written * 100 / size);
        if (percent / 5 != lastPercent / 5) {
            lastPercent = percent;
            Screens::ota(percent, tr(Texts::OTA_DOWNLOADING));
            // keep the connection alive and tell the site, every 20 %
            if (percent % 20 == 0 && !atBoot) {
                mqttLoop();
                report("downloading", percent);
            }
        }
        yield();
    }
    http.end();

    if (written != size) {
        Update.end(false);
        return "download interrupted at " + String(written) + " of " + String(size) + " bytes";
    }
    if (!Update.end()) {
#if defined(ESP8266)
        return "image rejected: " + Update.getErrorString();
#else
        return String("image rejected: ") + Update.errorString();
#endif
    }
    return "";
}

void restart() {
    // let the status leave before the restart
    for (int i = 0; i < 10; i++) {
        if (!atBoot)
            mqttLoop();
        delay(50);
    }
    ESP.restart();
}

} // namespace

namespace FirmwareUpdate {

void request(const String &url, const String &md5, const String &version) {
    if (running)
        return;
    pendingUrl = url;
    pendingMd5 = md5;
    pendingVersion = version;
    pending = true;
}

void runAtBoot() {
#if defined(ESP8266)
    Record record;
    if (!loadRecord(record))
        return;
    if (record.state == STATE_FAILED) {
        pendingVersion = record.version;
        failure = record.error;
        failureToReport = true;
        clearRecord();
        return;
    }
    if (record.state != STATE_PENDING)
        return;

    atBoot = true;
    running = true;
    pendingUrl = record.url;
    pendingMd5 = record.md5;
    pendingVersion = record.version;
    // a crash during the download must not try again on every boot
    saveRecord(STATE_FAILED, "restarted during the download");
    Serial.println("[UPDATE] Updating to " + pendingVersion + " at boot, free heap " + String(ESP.getFreeHeap()));

    Screens::ota(0, tr(Texts::OTA_CONNECTING_WIFI));
    String error = ServerManager::tryConnectWiFi() ? run() : "no Wi-Fi to download the update";
    if (error.length()) {
        Serial.println("[UPDATE] Failed: " + error);
        Screens::ota(0, tr(Texts::OTA_FAILED));
        system_update_cpu_freq(SYS_CPU_80MHZ);
        clearRecord();
        failure = error;
        failureToReport = true;
        running = false;
        atBoot = false;
        return;
    }
    clearRecord();
    Serial.println("[UPDATE] Done, restarting into " + pendingVersion);
    Screens::ota(100, tr(Texts::OTA_DONE));
    restart();
#endif
}

void loop() {
#if defined(ESP8266)
    // tried again from every loop() until MQTT is connected
    if (failureToReport && report("failed", 0, failure))
        failureToReport = false;
#endif
    if (!pending)
        return;
    pending = false;
    running = true;
    Serial.println("[UPDATE] Updating to " + pendingVersion + " from " + pendingUrl);
    report("downloading", 0);

#if defined(ESP8266)
    if (pendingUrl.length() >= sizeof(Record::url)) {
        report("failed", 0, "URL too long");
        running = false;
        return;
    }
    saveRecord(STATE_PENDING);
    Screens::ota(0, tr(Texts::OTA_RESTART_TO_DOWNLOAD));
    restart();
#else
    String error = run();
    if (error.length()) {
        Serial.println("[UPDATE] Failed: " + error);
        Screens::ota(0, tr(Texts::OTA_FAILED));
        report("failed", 0, error);
        running = false;
        return;
    }
    report("done", 100);
    Screens::ota(100, tr(Texts::OTA_DONE));
    restart();
#endif
}

bool inProgress() {
    return running || pending;
}

} // namespace FirmwareUpdate
