#include "ServerManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "storage/Storage.h"
#if defined(ESP8266)
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <base64.h> // required by ESP8266WebServer implementation
#else
#include <WebServer.h>
#include <WiFi.h>
#endif

#if defined(ESP8266)
static ESP8266WebServer server(80);
#else
static WebServer server(80);
#endif

static String savedSSID = "";
static String savedPASS = "";
static bool wifiConfigured = false;
static bool serverStarted = false;
static unsigned long apStartedAt = 0;
// in setup mode with saved WiFi, reboot after this time so a temporary outage does not need a manual reset
static const unsigned long AP_RESTART_TIMEOUT_MS = 5UL * 60UL * 1000UL;
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 20000;

#if defined(ESP8266)
String ServerManager::apSsid = "ESP8266-Setup";
#else
String ServerManager::apSsid = "ESP32-Setup";
#endif
String ServerManager::apPass = "yLDJAYuf";

// =========================
//  Page parts, kept in flash: the ESP8266 has little RAM
// =========================

// same look as the site sign-in page: off-white, serif headings, one blue accent, thin borders
static const char PAGE_HEAD[] PROGMEM = R"HTML(<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Smart Sensor Network</title><style>
body{margin:0;background:#fbfaf8;color:#1c1c1a;font:15px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif}
.w{max-width:420px;margin:0 auto;padding:20px 16px 32px}
header{display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid #0001}
header b{font:400 17px Georgia,serif}
.k{margin:22px 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#1d4f91}
h1{margin:0 0 10px;font:400 25px/1.25 Georgia,serif}
p,li{color:#000b}.m{font-size:13px;color:#0008}
.c{margin:16px 0;padding:18px;background:#fff;border:1px solid #0002}
label{display:block;margin:12px 0 4px;font-size:13px;font-weight:600}
input{box-sizing:border-box;width:100%;padding:9px 10px;font:inherit;background:#fff;border:1px solid #0003;border-radius:6px}
button{width:100%;margin-top:16px;padding:10px;font:inherit;font-weight:600;color:#fff;background:#1c1c1a;border:0;border-radius:6px}
button.s{color:#1c1c1a;background:#fff;border:1px solid #0003}
summary{margin-top:14px;font-size:13px;color:#0009;cursor:pointer}
.code{margin:14px 0;padding:16px 0;font:600 34px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;text-align:center;color:#1d4f91;border:1px dashed #1d4f91}
a{color:#1d4f91}ol{padding-left:20px}
footer{margin-top:24px;font-size:12px;text-align:center;color:#0007}
</style></head><body><div class="w"><header>
<svg width="28" height="28" viewBox="0 0 64 64"><defs><clipPath id="a"><circle cx="32" cy="32" r="20"/></clipPath></defs>
<rect width="64" height="64" rx="14" fill="#2563eb"/><g clip-path="url(#a)" fill="#fff"><polygon id="b" points="26,12 46,0.45 46,14.45 26,26"/>
<use href="#b" transform="rotate(60 32 32)"/><use href="#b" transform="rotate(120 32 32)"/><use href="#b" transform="rotate(180 32 32)"/>
<use href="#b" transform="rotate(240 32 32)"/><use href="#b" transform="rotate(300 32 32)"/></g></svg>
<b>Smart Sensor Network</b></header>)HTML";

static String escape(const String &value) {
    String out;
    out.reserve(value.length());
    for (size_t i = 0; i < value.length(); i++) {
        char c = value[i];
        if (c == '<') out += "&lt;";
        else if (c == '>') out += "&gt;";
        else if (c == '&') out += "&amp;";
        else if (c == '"') out += "&quot;";
        else if (c == '\'') out += "&#39;";
        else out += c;
    }
    return out;
}

static bool hasAccount() {
    String userId = Storage::loadUserId();
    userId.trim();
    if (userId.length() == 0) return false;
    for (size_t i = 0; i < userId.length(); i++) {
        if (!isDigit(userId[i])) return false; // erased EEPROM reads as garbage
    }
    return true;
}

static String footer() {
    return "<footer>" + hardwareId() + " · firmware " FIRMWARE_VERSION "</footer></div></body></html>";
}

// =========================
//  Public getters
// =========================
String ServerManager::getSsid() {
    return apSsid;
}

String ServerManager::getPass() {
    return apPass;
}

String ServerManager::getSavedSsid() {
    return savedSSID;
}

// =========================
//  Pages
// =========================
static String pairingPage() {
    String html;
    html.reserve(3000);
    html += "<meta http-equiv=\"refresh\" content=\"5\">";
    html += "<div class=\"k\">Step 2 of 2</div><h1>Link this board to your account</h1>";
    html += "<p class=\"m\">Wi-Fi <b>" + escape(savedSSID) + "</b> is connected.</p>";

    const String &code = pairingCode();
    if (code.length() == 0) {
        html += "<div class=\"c\"><p>";
        html += mqttConnected() ? "Getting a code from the server…" : "Connecting to the server…";
        html += "</p><p class=\"m\">This page refreshes by itself.</p></div>";
        return html;
    }

    String link = String("https://" SITE_HOST "/pair?code=") + code;
    html += "<div class=\"c\"><div class=\"m\">Your code</div><div class=\"code\">" + code + "</div><ol>";
    html += "<li>Switch your phone back to the internet.</li>";
    html += "<li>Open <a href=\"" + link + "\">" SITE_HOST "/pair</a> and sign in: with a password, Google or GitHub.</li>";
    html += "<li>Enter the code. The board connects by itself in a few seconds.</li></ol>";
    html += "<p class=\"m\">The code is also on the board display and is valid for 15 minutes.</p></div>";
    return html;
}

static String setupPage() {
    String curSsid = Storage::loadSSID();
    String server = Storage::loadMqttServer();
    uint16_t port = Storage::loadMqttPort();
    bool linked = hasAccount();

    String html;
    html.reserve(3500);
    html += "<div class=\"k\">";
    html += linked ? "Board settings" : "Step 1 of 2";
    html += "</div><h1>";
    html += linked ? "Wi-Fi and server" : "Connect the board to Wi-Fi";
    html += "</h1><form class=\"c\" method=\"post\" action=\"/save\">";

    // networks around, so the name does not have to be typed
    html += "<label for=\"ssid\">Network</label><input id=\"ssid\" name=\"ssid\" list=\"nets\" required value=\"" + escape(curSsid) + "\">";
    html += "<datalist id=\"nets\">";
    int found = WiFi.scanComplete();
    for (int i = 0; i < found && i < 15; i++) {
        html += "<option value=\"" + escape(WiFi.SSID(i)) + "\">";
    }
    html += "</datalist>";
    html += "<label for=\"pass\">Password</label><input id=\"pass\" name=\"pass\" type=\"password\" placeholder=\"";
    html += curSsid.length() ? "leave empty to keep the saved one" : "";
    html += "\">";

    html += "<details><summary>Server settings</summary>";
    html += "<label for=\"mqtt_server\">MQTT server</label><input id=\"mqtt_server\" name=\"mqtt_server\" placeholder=\"default\" value=\"" + escape(server) + "\">";
    html += "<label for=\"mqtt_port\">Port</label><input id=\"mqtt_port\" name=\"mqtt_port\" type=\"number\" placeholder=\"1883\" value=\"";
    if (port > 0) html += String(port);
    html += "\"><label for=\"mqtt_user\">User</label><input id=\"mqtt_user\" name=\"mqtt_user\" placeholder=\"default\">";
    html += "<label for=\"mqtt_pass\">Password</label><input id=\"mqtt_pass\" name=\"mqtt_pass\" type=\"password\" placeholder=\"default\">";
    html += "<p class=\"m\">Leave empty to keep the current values.</p></details>";
    html += "<button type=\"submit\">Save and connect</button></form>";

    if (linked) {
        html += "<form class=\"c\" method=\"post\" action=\"/unpair\"><p class=\"m\">The board is linked to an account. "
                "Unlink it to give it to someone else: after restart it shows a new code.</p>"
                "<button class=\"s\" type=\"submit\">Unlink from account</button></form>";
    } else {
        html += "<p class=\"m\">Next, the board shows a code to link it to your account on " SITE_HOST ". "
                "No user id or password is entered here.</p>";
    }
    return html;
}

void ServerManager::handleRootPage() {
    String html = FPSTR(PAGE_HEAD);
    bool waitingForPairing = wifiConfigured && isPairing();
    html += waitingForPairing ? pairingPage() : setupPage();
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
}

void ServerManager::handleSavePage() {
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    ssid.trim();
    if (ssid.length() > 0) {
        // an empty password keeps the saved one when the network did not change
        if (pass.length() == 0 && ssid == Storage::loadSSID()) {
            pass = Storage::loadPASS();
        }
        Storage::saveCredentials(ssid, pass);
    }
    if (server.arg("mqtt_server").length() > 0) Storage::saveMqttServer(server.arg("mqtt_server"));
    uint16_t port = (uint16_t)server.arg("mqtt_port").toInt();
    if (port > 0) Storage::saveMqttPort(port);
    if (server.arg("mqtt_user").length() > 0) Storage::saveMqttUser(server.arg("mqtt_user"));
    if (server.arg("mqtt_pass").length() > 0) Storage::saveMqttPass(server.arg("mqtt_pass"));
    Storage::sync();

    String html = FPSTR(PAGE_HEAD);
    html += "<div class=\"k\">Saved</div><h1>Connecting…</h1><div class=\"c\"><p>The board restarts and connects to <b>" + escape(ssid) +
            "</b>.</p><p class=\"m\">If it is not linked yet, reconnect to the <b>" + apSsid +
            "</b> network in half a minute and open this page again to see the code.</p></div>";
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
    delay(1500);
    ESP.restart();
}

void ServerManager::handleUnpair() {
    Storage::saveUserId("");
    Storage::sync();
    String html = FPSTR(PAGE_HEAD);
    html += "<div class=\"k\">Unlinked</div><h1>The board was unlinked</h1><div class=\"c\"><p>It restarts and shows a new code to link it to an account.</p></div>";
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
    delay(1500);
    ESP.restart();
}

// =========================
//  Wi-Fi
// =========================
bool ServerManager::tryConnectWiFi() {
    if (savedSSID.isEmpty())
        return false;

    WiFi.disconnect(false);
    delay(200);
    WiFi.mode(WIFI_STA);
#if defined(ESP8266)
    WiFi.setPhyMode(WIFI_PHY_MODE_11G);
#endif
    Serial.println("Connecting to WiFi: " + savedSSID);
    WiFi.begin(savedSSID.c_str(), savedPASS.c_str());

    unsigned long startTime = millis();
    while (millis() - startTime < WIFI_ATTEMPT_TIMEOUT_MS && WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    Serial.printf("[WIFI] status %d\n", WiFi.status());
    return WiFi.status() == WL_CONNECTED;
}

void ServerManager::startServer() {
    if (!serverStarted) {
        server.on("/", ServerManager::handleRootPage);
        server.on("/save", HTTP_POST, ServerManager::handleSavePage);
        server.on("/unpair", HTTP_POST, ServerManager::handleUnpair);
        // phones probe these to detect a captive portal; send them to the page
        server.onNotFound([]() {
            server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/", true);
            server.send(302, "text/plain", "");
        });
        server.begin();
        serverStarted = true;
    }
}

void ServerManager::enterSetupMode() {
    startAPMode();
}

void ServerManager::startAPMode() {
    Serial.println("Starting WiFi setup AP…");
    wifiConfigured = false;

    WiFi.disconnect(false);
    delay(200);
    WiFi.mode(WIFI_AP);
    delay(200);
    if (!WiFi.softAP(apSsid.c_str(), apPass.c_str(), 1, false)) {
        Serial.println("[ERROR] softAP start failed!");
        return;
    }
    apStartedAt = millis();
    // fill the network list of the page
    WiFi.scanNetworks(true);

    Serial.println("Connect to AP: " + apSsid + " / " + apPass + ", open http://" + WiFi.softAPIP().toString());
    startServer();
}

void ServerManager::startPairingPortal() {
    // the access point follows the channel of the Wi-Fi connection
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(apSsid.c_str(), apPass.c_str());
    Serial.println("[PAIR] Setup page with the code: join " + apSsid + " and open http://" + WiFi.softAPIP().toString());
    startServer();
}

// =========================
//  Public functions
// =========================
void ServerManager::begin() {
    savedSSID = Storage::loadSSID();
    savedPASS = Storage::loadPASS();
    Serial.println("Saved SSID: " + savedSSID);
}

void ServerManager::connect() {
    for (int attempt = 1; attempt <= WIFI_CONNECT_RETRIES; ++attempt) {
        Serial.printf("[WIFI] Attempt %d\n", attempt);
        if (tryConnectWiFi()) {
            wifiConfigured = true;
            Serial.println("Connected, IP: " + WiFi.localIP().toString());
            return;
        }
        if (savedSSID.isEmpty()) break;
        WiFi.disconnect(false);
        delay(1000);
    }
    wifiConfigured = false;
    Serial.println("[WIFI] Not connected, starting setup AP");
    startAPMode();
}

void ServerManager::loop() {
    if (serverStarted) {
        server.handleClient();
    }

    if (!wifiConfigured && apStartedAt != 0 && savedSSID.length() > 0 &&
        millis() - apStartedAt > AP_RESTART_TIMEOUT_MS && WiFi.softAPgetStationNum() == 0) {
        Serial.println("[SETUP] Nobody configured the device, rebooting to retry saved WiFi");
        delay(200);
        ESP.restart();
    }
}

bool ServerManager::isConfigured() {
    return wifiConfigured;
}
