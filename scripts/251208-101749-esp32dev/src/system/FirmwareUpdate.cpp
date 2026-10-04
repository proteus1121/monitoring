#include "FirmwareUpdate.h"
#include "../display/Screens.h"
#include "../network/mqtt/MQTTHandler.h"
#include "TrustedRoots.h"
#include <time.h>

#if defined(ESP8266)
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <Updater.h>
#include <WiFiClientSecureBearSSL.h>
#else
#include <HTTPClient.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#endif

namespace {

bool pending = false;
bool running = false;
String pendingUrl;
String pendingMd5;
String pendingVersion;

void report(const char *state, int progress, const String &error = "") {
    String payload = String("{\"state\":\"") + state + "\",\"progress\":" + progress + ",\"version\":\"" +
                     pendingVersion + "\"";
    if (error.length()) {
        String escaped = error;
        escaped.replace("\"", "'");
        payload += ",\"error\":\"" + escaped + "\"";
    }
    payload += "}";
    publishUpdateStatus(payload);
    Serial.println("[UPDATE] " + payload);
}

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

    Screens::ota(0, "connecting");
    String pem = FPSTR(TRUSTED_ROOTS_PEM);
#if defined(ESP8266)
    // TLS needs about 20 kB, give back what MQTT holds while downloading
    shrinkMqttBuffer(true);
    BearSSL::X509List roots(pem.c_str());
    BearSSL::WiFiClientSecure client;
    client.setTrustAnchors(&roots);
    client.setBufferSizes(16384, 512);
    Serial.printf("[UPDATE] Free heap before download: %u\n", ESP.getFreeHeap());
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
        return status < 0 ? "download failed: " + http.errorToString(status) : "server answered " + String(status);
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
            Screens::ota(percent, "downloading");
            // keep the connection alive and tell the site, every 20 %
            if (percent % 20 == 0) {
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

void loop() {
    if (!pending)
        return;
    pending = false;
    running = true;
    Serial.println("[UPDATE] Updating to " + pendingVersion + " from " + pendingUrl);
    report("downloading", 0);

    String error = run();
    if (error.length()) {
        Serial.println("[UPDATE] Failed: " + error);
        Screens::ota(0, "failed, old firmware kept");
#if defined(ESP8266)
        shrinkMqttBuffer(false);
#endif
        report("failed", 0, error);
        running = false;
        return;
    }
    report("done", 100);
    Screens::ota(100, "done, restarting");
    // let the status leave before the restart
    for (int i = 0; i < 10; i++) {
        mqttLoop();
        delay(50);
    }
    ESP.restart();
}

bool inProgress() {
    return running || pending;
}

} // namespace FirmwareUpdate
