#include "ServerManager.h"
#include "network/mqtt/MQTTHandler.h"
#include "storage/Storage.h"
#if defined(ESP8266)
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <base64.h> // required by ESP8266WebServer implementation
#include <lwip/napt.h>
#else
#include <WebServer.h>
#include <WiFi.h>
#endif

// The board can route its access point to its Wi-Fi (NAPT): the phone on the access point then reaches the
// site and signs in without leaving the board's page. The ESP32 Arduino core 2.x is built without IP forwarding.
#if defined(ESP8266) && IP_NAPT
#define SETUP_NAPT 1
#else
#define SETUP_NAPT 0
#endif

#if defined(ESP8266)
static ESP8266WebServer server(80);
#else
static WebServer server(80);
#endif

static String savedSSID = "";
static String savedPASS = "";
static bool wifiConfigured = false;
// one sign-in from this page at a time, see linkPage()
static String linkState = "";
static bool serverStarted = false;
static unsigned long apStartedAt = 0;
// in setup mode with saved WiFi, reboot after this time so a temporary outage does not need a manual reset
static const unsigned long AP_RESTART_TIMEOUT_MS = 5UL * 60UL * 1000UL;
static const unsigned long WIFI_ATTEMPT_TIMEOUT_MS = 20000;

// Wi-Fi saved on the setup page and joined without a restart, next to the access point (SETUP_NAPT only)
enum class Join { None, Pending, Connecting, Connected, Failed };
static Join join = Join::None;
static unsigned long joinStartedAt = 0;
static bool naptOn = false;
#if SETUP_NAPT
// connections of the phone through the board at once: enough for the site, small for the ESP8266 heap
static const uint16_t NAPT_ENTRIES = 256;
static const uint8_t NAPT_PORT_MAPS = 4;
// DNS server for the phone on the access point, reached through NAPT. A public one: the phone may get it before
// the board is on Wi-Fi, and the DHCP server offers one address only, while a network's first one may not answer
// (the board itself falls back to the second).
static const IPAddress SETUP_DNS(8, 8, 8, 8);
#endif

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

bool ServerManager::accessPointRoutes() {
    return naptOn;
}

// =========================
//  Pages
// =========================
// address of this board for the page being served: the access point or the home network
static String servedAddress() {
    return server.client().localIP().toString();
}

static bool servedOnAccessPoint() {
    return server.client().localIP() == WiFi.softAPIP();
}

static String urlEncode(const String &value) {
    static const char HEX_DIGITS[] = "0123456789ABCDEF";
    String out;
    out.reserve(value.length() * 3);
    for (size_t i = 0; i < value.length(); i++) {
        char c = value[i];
        if (isAlphaNumeric(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            out += c;
        } else {
            out += '%';
            out += HEX_DIGITS[(uint8_t)c >> 4];
            out += HEX_DIGITS[(uint8_t)c & 15];
        }
    }
    return out;
}

// "Sign in": the site links the board and sends the browser back to /connect with its MQTT login. The state
// is made at boot and only lives in RAM, so only a sign-in started from this page is accepted.
static String linkPage() {
    String html;
    html.reserve(2500);
    html += "<div class=\"k\">Step 2 of 2</div><h1>Link this board to your account</h1>";
    html += "<p class=\"m\">Wi-Fi <b>" + escape(savedSSID) + "</b> is connected.</p>";

    String lan = WiFi.localIP().toString();
    if (servedOnAccessPoint() && !naptOn) {
        // the phone has no internet on the board's network, so signing in starts from the home network
        html += "<div class=\"c\"><ol><li>Switch your phone back to <b>" + escape(savedSSID) + "</b>.</li>";
        html += "<li>Open <a href=\"http://" + lan + "/\">http://" + lan + "</a> (it is also on the board display).</li>";
        html += "<li>Press <b>Sign in</b> there.</li></ol></div>";
        return html;
    }

    String back = "http://" + servedAddress() + "/connect";
    String link = String("https://" SITE_HOST "/connect?hw=") + urlEncode(hardwareId());
#if defined(ESP8266)
    link += "&platform=esp8266";
#else
    link += "&platform=esp32";
#endif
    link += "&fw=" FIRMWARE_VERSION "&state=" + linkState + "&back=" + urlEncode(back);
    html += "<div class=\"c\"><p>Sign in on " SITE_HOST ": with a password, Google or GitHub. The site gives the "
            "board its own login and brings you back here.</p>";
    html += "<a href=\"" + link + "\"><button type=\"button\">Sign in</button></a>";
    String network = servedOnAccessPoint() ? ServerManager::getSsid() : savedSSID;
    html += "<p class=\"m\">Keep this phone or computer on " + escape(network) + " until you are back on this page.</p></div>";
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
    html += "</h1>";
    if (join == Join::Failed) {
        html += "<p>The board could not connect to <b>" + escape(savedSSID) + "</b>. Check the network name and password.</p>";
    }
    html += "<form class=\"c\" method=\"post\" action=\"/save\">";

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
    html += "\"><p class=\"m\">Leave empty to keep the current values. The login to the server comes from linking the board.</p></details>";
    html += "<button type=\"submit\">Save and connect</button></form>";

    if (linked) {
        html += "<form class=\"c\" method=\"post\" action=\"/unpair\"><p class=\"m\">The board is linked to an account. "
                "Unlink it to give it to someone else, or when the server no longer accepts it: after restart you sign in again.</p>"
                "<button class=\"s\" type=\"submit\">Unlink from account</button></form>";
    } else {
        html += "<p class=\"m\">Next, you sign in on " SITE_HOST " from the board's page to link it to your account. "
                "No account password is entered here.</p>";
    }
    return html;
}

void ServerManager::handleRootPage() {
    String html = FPSTR(PAGE_HEAD);
    bool waitingForLink = (wifiConfigured || join == Join::Connected) && !isLinked();
    html += waitingForLink ? linkPage() : setupPage();
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
    Storage::sync();
    savedSSID = Storage::loadSSID();
    savedPASS = Storage::loadPASS();

#if SETUP_NAPT
    if (!hasAccount() && savedSSID.length() > 0) {
        // join next to the access point and sign in from this page; loop() starts the connection
        join = Join::Pending;
        server.sendHeader("Location", "/joining", true);
        server.send(303, "text/plain", "");
        return;
    }
#endif

    String html = FPSTR(PAGE_HEAD);
    html += "<div class=\"k\">Saved</div><h1>Connecting…</h1><div class=\"c\"><p>The board restarts and connects to <b>" + escape(ssid) +
            "</b>.</p><p class=\"m\">If it is not linked yet, reconnect to the <b>" + apSsid +
            "</b> network in half a minute and open this page again to sign in.</p></div>";
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
    delay(1500);
    ESP.restart();
}

// waits for the Wi-Fi joined after /save, then opens the page again: it has "Sign in" there
static const char JOINING_SCRIPT[] PROGMEM = R"JS(<script>
var fails=0;
function poll(){fetch('/status',{cache:'no-store'}).then(function(r){return r.text()}).then(function(s){
fails=0;if(s!='connecting'){location.replace('/');return}setTimeout(poll,1500)
}).catch(function(){if(++fails>3)document.getElementById('lost').hidden=false;setTimeout(poll,2000)})}
setTimeout(poll,1500);
</script>)JS";

void ServerManager::handleJoining() {
    String html = FPSTR(PAGE_HEAD);
    html += "<div class=\"k\">Step 1 of 2</div><h1>Connecting to " + escape(savedSSID) + "…</h1><div class=\"c\">"
            "<p>This takes up to half a minute. Stay on this page: it moves on to signing in by itself.</p>"
            "<p class=\"m\" id=\"lost\" hidden>The board does not answer. If your phone left the <b>" + apSsid +
            "</b> network, join it again; this page goes on.</p></div>";
    html += FPSTR(JOINING_SCRIPT);
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
}

void ServerManager::handleStatus() {
    const char *state = "idle";
    if (join == Join::Pending || join == Join::Connecting) state = "connecting";
    else if (join == Join::Connected) state = "connected";
    else if (join == Join::Failed) state = "failed";
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "text/plain", state);
}

void ServerManager::handleUnpair() {
    forgetAccount();
    String html = FPSTR(PAGE_HEAD);
    html += "<div class=\"k\">Unlinked</div><h1>The board was unlinked</h1><div class=\"c\"><p>It restarts; open its page and sign in to link it to an account.</p></div>";
    html += footer();
    server.send(200, "text/html; charset=utf-8", html);
    delay(1500);
    ESP.restart();
}

static bool printable(const String &value, size_t maxLength) {
    if (value.length() == 0 || value.length() > maxLength)
        return false;
    for (size_t i = 0; i < value.length(); i++) {
        if (value[i] < 0x21 || value[i] > 0x7E)
            return false;
    }
    return true;
}

// the browser comes back from the site: /connect?state=…&uid=…&user=…&pass=…&host=…&port=…
void ServerManager::handleConnect() {
    String uid = server.arg("uid");
    String user = server.arg("user");
    String pass = server.arg("pass");
    String host = server.arg("host");
    long port = server.arg("port").toInt();
    bool digits = uid.length() > 0 && uid.length() <= 20;
    for (size_t i = 0; i < uid.length(); i++)
        digits = digits && isDigit(uid[i]);

    String html = FPSTR(PAGE_HEAD);
    if (linkState.length() == 0 || server.arg("state") != linkState) {
        html += "<div class=\"k\">Not linked</div><h1>This link is not for this board</h1><div class=\"c\"><p>"
                "Open the board's page again and press Sign in there.</p></div>";
    } else if (!digits || !printable(user, 32) || !printable(pass, 32) || !printable(host, 32) || port <= 0 ||
               port > 65535) {
        html += "<div class=\"k\">Not linked</div><h1>The answer from the site is incomplete</h1><div class=\"c\"><p>"
                "Open the board's page again and sign in once more.</p></div>";
    } else {
        Storage::saveUserId(uid);
        Storage::saveMqttUser(user);
        Storage::saveMqttPass(pass);
        Storage::saveMqttServer(host);
        Storage::saveMqttPort((uint16_t)port);
        Storage::sync();
        Serial.println("[LINK] Linked to user " + uid + ", restarting");
        html += "<div class=\"k\">Linked</div><h1>The board is linked</h1><div class=\"c\"><p>It restarts and appears on "
                "<a href=\"https://" SITE_HOST "/settings/devices\">My devices</a> in a few seconds.</p></div>";
        html += footer();
        server.send(200, "text/html; charset=utf-8", html);
        delay(1500);
        ESP.restart();
        return;
    }
    html += footer();
    server.send(400, "text/html; charset=utf-8", html);
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
        server.on("/connect", HTTP_GET, ServerManager::handleConnect);
        server.on("/joining", HTTP_GET, ServerManager::handleJoining);
        server.on("/status", HTTP_GET, ServerManager::handleStatus);
        // phones probe these to detect a captive portal; send them to the page
        server.onNotFound([]() {
            server.sendHeader("Location", "http://" + servedAddress() + "/", true);
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
    join = Join::None;

    WiFi.disconnect(false);
    delay(200);
#if SETUP_NAPT
    // The Wi-Fi joined from the page moves the access point to its channel and drops the phone for a moment.
    // Start on the channel it most likely has: the saved network, or else the strongest one around.
    WiFi.mode(WIFI_STA);
    int found = WiFi.scanNetworks(false);
    int channel = 1;
    int best = -1000;
    for (int i = 0; i < found; i++) {
        if (savedSSID.length() > 0 && WiFi.SSID(i) == savedSSID) {
            channel = WiFi.channel(i);
            break;
        }
        if (WiFi.RSSI(i) > best) {
            best = WiFi.RSSI(i);
            channel = WiFi.channel(i);
        }
    }
    // the station stays on, idle, to join the Wi-Fi saved on the page without a restart
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAPDhcpServer().setDns(SETUP_DNS);
#else
    WiFi.mode(WIFI_AP);
    int channel = 1;
#endif
    delay(200);
    if (!WiFi.softAP(apSsid.c_str(), apPass.c_str(), channel, false)) {
        Serial.println("[ERROR] softAP start failed!");
        return;
    }
    apStartedAt = millis();
#if !SETUP_NAPT
    // fill the network list of the page
    WiFi.scanNetworks(true);
#endif

    Serial.println("Connect to AP: " + apSsid + " / " + apPass + ", open http://" + WiFi.softAPIP().toString());
    startServer();
}

void ServerManager::startLinkPortal() {
    // the access point follows the channel of the Wi-Fi connection
    WiFi.mode(WIFI_AP_STA);
#if SETUP_NAPT
    WiFi.softAPDhcpServer().setDns(SETUP_DNS);
#endif
    WiFi.softAP(apSsid.c_str(), apPass.c_str());
    startNapt();
    Serial.println("[LINK] Sign in from the board's page: http://" + WiFi.localIP().toString() + " (or join " + apSsid +
                   " and open http://" + WiFi.softAPIP().toString() + ")");
    startServer();
}

// =========================
//  Public functions
// =========================
void ServerManager::begin() {
    char state[17];
#if defined(ESP8266)
    snprintf(state, sizeof(state), "%08x%08x", ESP.random(), ESP.random());
#else
    snprintf(state, sizeof(state), "%08x%08x", esp_random(), esp_random());
#endif
    linkState = state;
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

void ServerManager::startNapt() {
#if SETUP_NAPT
    if (naptOn) return;
    static bool tablesReady = false;
    uint32_t heap = ESP.getFreeHeap();
    if (!tablesReady) {
        if (ip_napt_init(NAPT_ENTRIES, NAPT_PORT_MAPS) != ERR_OK) {
            Serial.println("[NAPT] No memory for the tables");
            return;
        }
        tablesReady = true;
    }
    if (ip_napt_enable_no(SOFTAP_IF, 1) != ERR_OK) {
        Serial.println("[NAPT] Could not route the access point");
        return;
    }
    naptOn = true;
    Serial.printf("[NAPT] The access point reaches the internet through %s, heap %u -> %u\n",
                  WiFi.localIP().toString().c_str(), heap, ESP.getFreeHeap());
#endif
}

// the Wi-Fi saved on the page, joined next to the access point
void ServerManager::joinLoop() {
    if (join == Join::Pending) {
        Serial.println("[JOIN] Connecting to " + savedSSID + " next to the access point");
        WiFi.disconnect(false);
#if defined(ESP8266)
        WiFi.setPhyMode(WIFI_PHY_MODE_11G);
#endif
        WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
        joinStartedAt = millis();
        join = Join::Connecting;
        return;
    }
    if (join != Join::Connecting) return;

    wl_status_t status = WiFi.status();
    if (status == WL_CONNECTED) {
        Serial.println("[JOIN] Connected, IP: " + WiFi.localIP().toString());
        startNapt();
        join = Join::Connected;
    } else if (millis() - joinStartedAt > WIFI_ATTEMPT_TIMEOUT_MS
#if defined(ESP8266)
               || status == WL_WRONG_PASSWORD
#endif
    ) {
        Serial.printf("[JOIN] Not connected, status %d\n", status);
        // stop retrying in the background: its scans hop channels and take the access point along
        WiFi.disconnect(false);
        join = Join::Failed;
    }
}

void ServerManager::loop() {
    if (serverStarted) {
        server.handleClient();
    }
    joinLoop();

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
