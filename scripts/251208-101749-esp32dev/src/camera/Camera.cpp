#include "Camera.h"

#if defined(CAMERA_BOARD)

#include "../network/mqtt/MQTTHandler.h"
#include <WiFi.h>
#include "esp_camera.h"
#include "esp_jpg_decode.h"
#include "esp_heap_caps.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

namespace {

// AI-Thinker ESP32-CAM
const int PWDN_GPIO_NUM = 32;
const int RESET_GPIO_NUM = -1;
const int XCLK_GPIO_NUM = 0;
const int SIOD_GPIO_NUM = 26;
const int SIOC_GPIO_NUM = 27;
const int Y9_GPIO_NUM = 35;
const int Y8_GPIO_NUM = 34;
const int Y7_GPIO_NUM = 39;
const int Y6_GPIO_NUM = 36;
const int Y5_GPIO_NUM = 21;
const int Y4_GPIO_NUM = 19;
const int Y3_GPIO_NUM = 18;
const int Y2_GPIO_NUM = 5;
const int VSYNC_GPIO_NUM = 25;
const int HREF_GPIO_NUM = 23;
const int PCLK_GPIO_NUM = 22;
// The flash LED is never used as an alarm lamp: it lights the scene being analysed, so an alarm would
// brighten the frame, raise the ratio and keep itself on.
const int LED_GPIO_NUM = 4;

const framesize_t FRAME_SIZE = FRAMESIZE_QVGA;
const int JPEG_QUALITY = 12;
const size_t MAX_JPEG_SIZE = 64 * 1024;
// the pipeline of the paper: the QVGA frame decoded at full scale, every 4th pixel analysed (19,200 samples).
// E14 found a half-scale decode with every pixel 38% faster; the thresholds were validated on this one.
const jpg_scale_t DECODE_SCALE = JPG_SCALE_NONE;
const size_t SAMPLE_STEP = 4;
const size_t MAX_RGB_SIZE = 320 * 240 * 3;
const uint8_t CAPTURE_FPS = 20;

// thresholds of the flame monitor
const uint8_t V_MIN = 180;
const uint8_t S_MIN = 80;
const uint8_t D_MIN = 30;
const uint8_t G_DELTA = 20;
const float TAU_RATIO = 0.004f;
const float TAU_FLICKER = 5e-6f;
const uint8_t N_CONFIRM = 3;
const uint8_t HIST_LEN = 8;
const uint32_t HOLD_MS = 3000;

// live view: frames a second to the site, and how long one request of the site lasts
const uint32_t STREAM_INTERVAL_MS = 1000 / 6;
const uint32_t STREAM_REQUEST_MS = 30000;

bool cameraReady = false;
SemaphoreHandle_t lock = nullptr;

// newest frame of the sensor, shared by the tasks
uint8_t *sharedJpeg = nullptr;
size_t sharedLen = 0;
uint32_t sharedId = 0;
uint16_t sharedW = 0, sharedH = 0;
// private copies of the detection task and of the sender in loop()
uint8_t *workJpeg = nullptr;
uint8_t *sendJpeg = nullptr;
uint8_t *rgb = nullptr;

Camera::Vision current{};
volatile float cameraFps = 0;

// sending frames to the site, only touched from loop()
unsigned long streamUntil = 0;
uint32_t lastSentId = 0;
unsigned long lastSentAt = 0;

struct LockGuard {
    LockGuard() { xSemaphoreTake(lock, portMAX_DELAY); }
    ~LockGuard() { xSemaphoreGive(lock); }
};

// ---- colour rule, integer HSV with the hue in half degrees, as in the flame monitor ----

inline int16_t hueOf(uint8_t r, uint8_t g, uint8_t b, uint8_t maxC, uint8_t delta) {
    int16_t hue;
    if (maxC == r) {
        hue = 30 * (int16_t)(g - b) / delta;
        if (hue < 0)
            hue += 180;
    } else if (maxC == g) {
        hue = 30 * (int16_t)(b - r) / delta + 60;
    } else {
        hue = 30 * (int16_t)(r - g) / delta + 120;
    }
    return hue;
}

inline bool isFireColour(uint8_t r, uint8_t g, uint8_t b) {
    uint8_t maxC = max(r, max(g, b));
    uint8_t minC = min(r, min(g, b));
    uint8_t delta = maxC - minC;
    if (maxC < V_MIN || delta == 0)
        return false;
    if (r < b + D_MIN)
        return false;
    if (g > r + G_DELTA)
        return false;
    if ((uint16_t)delta * 255 / maxC < S_MIN)
        return false;
    int16_t hue = hueOf(r, g, b, maxC, delta);
    return hue <= 50 || hue >= 162;
}

// ---- JPEG decode at reduced scale ----

struct Decode {
    const uint8_t *jpeg;
    size_t len;
    uint8_t *out;
    size_t outSize;
    uint16_t w, h;
};

size_t readJpeg(void *arg, size_t index, uint8_t *buf, size_t len) {
    Decode *d = (Decode *)arg;
    if (index >= d->len)
        return 0;
    if (index + len > d->len)
        len = d->len - index;
    if (buf)
        memcpy(buf, d->jpeg + index, len);
    return len;
}

// The decoder hands over blocks of R, G, B bytes in the scaled frame's coordinates; the first call without
// data gives the frame size.
bool writeRgb(void *arg, uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint8_t *data) {
    Decode *d = (Decode *)arg;
    if (!data) {
        if (x == 0 && y == 0) {
            if ((size_t)w * h * 3 > d->outSize)
                return false;
            d->w = w;
            d->h = h;
        }
        return true;
    }
    if (x + w > d->w || y + h > d->h)
        return false;
    for (uint16_t row = 0; row < h; row++) {
        memcpy(d->out + ((size_t)(y + row) * d->w + x) * 3, data + (size_t)row * w * 3, (size_t)w * 3);
    }
    return true;
}

// ---- tasks ----

void captureTask(void *) {
    uint32_t frames = 0;
    int64_t windowStart = esp_timer_get_time();
    int64_t last = 0;
    for (;;) {
        int64_t due = last + 1000000 / CAPTURE_FPS;
        int64_t now = esp_timer_get_time();
        if (now < due) {
            vTaskDelay(pdMS_TO_TICKS((due - now) / 1000 + 1));
            continue;
        }
        last = now;
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            vTaskDelay(pdMS_TO_TICKS(5));
            continue;
        }
        if (fb->len <= MAX_JPEG_SIZE) {
            LockGuard guard;
            memcpy(sharedJpeg, fb->buf, fb->len);
            sharedLen = fb->len;
            sharedW = fb->width;
            sharedH = fb->height;
            sharedId++;
        }
        esp_camera_fb_return(fb);

        if (++frames >= 30) {
            now = esp_timer_get_time();
            cameraFps = 30.0f * 1e6f / (float)(now - windowStart);
            windowStart = now;
            frames = 0;
        }
        vTaskDelay(1);
    }
}

void detectionTask(void *) {
    float history[HIST_LEN] = {0};
    uint8_t histIdx = 0;
    uint8_t consec = 0;
    bool latched = false;
    uint32_t lastFullMs = 0;
    bool everFull = false;
    uint32_t lastId = 0;
    uint32_t frameNo = 0;
    int64_t prev = esp_timer_get_time();

    for (;;) {
        size_t len = 0;
        {
            LockGuard guard;
            if (sharedId != lastId && sharedLen) {
                len = sharedLen;
                lastId = sharedId;
                memcpy(workJpeg, sharedJpeg, len);
            }
        }
        if (!len) {
            vTaskDelay(pdMS_TO_TICKS(4));
            continue;
        }

        Decode d{workJpeg, len, rgb, MAX_RGB_SIZE, 0, 0};
        if (esp_jpg_decode(len, DECODE_SCALE, readJpeg, writeRgb, &d) != ESP_OK || d.w == 0) {
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }

        // spatial stage: every SAMPLE_STEP-th pixel in raster order, as in the paper
        uint32_t fire = 0, sampled = 0;
        uint32_t sum[3] = {0, 0, 0};
        uint16_t x1 = d.w, y1 = d.h, x2 = 0, y2 = 0;
        const size_t size = (size_t)d.w * d.h;
        for (size_t i = 0; i < size; i += SAMPLE_STEP) {
            const uint8_t *p = rgb + i * 3;
            sampled++;
            sum[0] += p[0];
            sum[1] += p[1];
            sum[2] += p[2];
            if (isFireColour(p[0], p[1], p[2])) {
                fire++;
                uint16_t x = i % d.w, y = i / d.w;
                if (x < x1) x1 = x;
                if (y < y1) y1 = y;
                if (x > x2) x2 = x;
                if (y > y2) y2 = y;
            }
        }
        const uint32_t pixels = sampled;
        const float ratio = (float)fire / (float)sampled;

        // temporal stage: flicker over the window and the confirmation counter
        history[histIdx] = ratio;
        histIdx = (histIdx + 1) % HIST_LEN;
        float mean = 0, meanSq = 0;
        for (uint8_t i = 0; i < HIST_LEN; i++) {
            mean += history[i];
            meanSq += history[i] * history[i];
        }
        mean /= HIST_LEN;
        float variance = max(0.0f, meanSq / HIST_LEN - mean * mean);

        if (ratio >= TAU_RATIO && variance >= TAU_FLICKER)
            consec = min((uint8_t)(consec + 1), N_CONFIRM);
        else if (consec > 0)
            consec--;

        // latch: raised by a full counter, cleared by an empty one and not within HOLD_MS of the last full one
        uint32_t nowMs = millis();
        if (consec >= N_CONFIRM) {
            latched = true;
            lastFullMs = nowMs;
            everFull = true;
        } else if (consec == 0) {
            latched = false;
        }
        bool alarm = latched || (everFull && nowMs - lastFullMs < HOLD_MS);

        int64_t now = esp_timer_get_time();
        float fps = 1e6f / (float)(now - prev);
        prev = now;
        frameNo++;

        {
            LockGuard guard;
            if (alarm != current.alarm)
                Serial.printf("[CAM] Flame %s, ratio %.4f\n", alarm ? "DETECTED" : "gone", ratio);
            current.alarm = alarm;
            current.ratio = ratio;
            current.variance = variance;
            current.consec = consec;
            current.bboxValid = fire > 0;
            current.bx1 = x1;
            current.by1 = y1;
            current.bx2 = x2;
            current.by2 = y2;
            current.width = d.w;
            current.height = d.h;
            // smoothed: one slow frame (a frame sent to the site in between) should not make it jump
            current.fps = current.fps == 0 ? fps : current.fps * 0.9f + fps * 0.1f;
            current.cameraFps = cameraFps;
            current.frame = frameNo;
            for (int c = 0; c < 3; c++)
                current.mean[c] = sum[c] / pixels;
        }
        // let the Wi-Fi and the main loop run
        vTaskDelay(1);
    }
}

String visionJson(const Camera::Vision &v) {
    char buf[256];
    int n = snprintf(buf, sizeof(buf), "{\"a\":%d,\"r\":%.5f,\"var\":%.3g,\"c\":%u,\"n\":%u,\"w\":%u,\"h\":%u,"
                                       "\"fps\":%.1f,\"cfps\":%.1f,\"m\":[%u,%u,%u]",
                     v.alarm ? 1 : 0, v.ratio, v.variance, v.consec, N_CONFIRM, v.width, v.height, v.fps,
                     v.cameraFps, v.mean[0], v.mean[1], v.mean[2]);
    if (v.bboxValid && n > 0 && n < (int)sizeof(buf))
        n += snprintf(buf + n, sizeof(buf) - n, ",\"b\":[%u,%u,%u,%u]", v.bx1, v.by1, v.bx2, v.by2);
    if (n > 0 && n < (int)sizeof(buf) - 1) {
        buf[n] = '}';
        buf[n + 1] = 0;
    }
    return String(buf);
}

} // namespace

namespace Camera {

bool begin() {
    pinMode(LED_GPIO_NUM, OUTPUT);
    digitalWrite(LED_GPIO_NUM, LOW);

    camera_config_t config = {};
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = FRAME_SIZE;
    config.jpeg_quality = JPEG_QUALITY;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    // always the newest frame: the detector describes the present, not a backlog
    config.grab_mode = CAMERA_GRAB_LATEST;

    if (!psramFound()) {
        Serial.println("[CAM] No PSRAM, the camera needs it");
        return false;
    }
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] Camera init failed: 0x%x\n", err);
        return false;
    }
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_whitebal(s, 1);
        s->set_awb_gain(s, 1);
    }

    sharedJpeg = (uint8_t *)heap_caps_malloc(MAX_JPEG_SIZE, MALLOC_CAP_SPIRAM);
    workJpeg = (uint8_t *)heap_caps_malloc(MAX_JPEG_SIZE, MALLOC_CAP_SPIRAM);
    sendJpeg = (uint8_t *)heap_caps_malloc(MAX_JPEG_SIZE, MALLOC_CAP_SPIRAM);
    rgb = (uint8_t *)heap_caps_malloc(MAX_RGB_SIZE, MALLOC_CAP_SPIRAM);
    lock = xSemaphoreCreateMutex();
    if (!sharedJpeg || !workJpeg || !sendJpeg || !rgb || !lock) {
        Serial.println("[CAM] Not enough memory for the frame buffers");
        return false;
    }

    // capture is short and must not wait for the decode, or the video rate would follow the analysis
    xTaskCreatePinnedToCore(captureTask, "capture", 4096, nullptr, 2, nullptr, 1);
    xTaskCreatePinnedToCore(detectionTask, "detect", 6144, nullptr, 1, nullptr, 1);
    cameraReady = true;
    Serial.printf("[CAM] Camera ready, %u KB PSRAM free\n",
                  (unsigned)(heap_caps_get_free_size(MALLOC_CAP_SPIRAM) / 1024));
    return true;
}

bool ready() {
    return cameraReady;
}

Vision vision() {
    if (!cameraReady)
        return Vision{};
    LockGuard guard;
    return current;
}

void onStreamRequest(const uint8_t *payload, unsigned int length) {
    bool on = length > 0 && payload[0] == '1';
    if (on && streamUntil == 0)
        Serial.println("[CAM] The site is watching, sending frames");
    else if (!on && streamUntil != 0)
        Serial.println("[CAM] Nobody watches any more");
    // 0 means "not streaming"; millis() can be 0 only right after boot
    streamUntil = on ? max(millis() + STREAM_REQUEST_MS, 1UL) : 0;
}

void loop() {
    if (!cameraReady)
        return;
    // modem sleep halves the upload rate; the board is powered anyway
    static bool sleepOff = false;
    if (!sleepOff && WiFi.status() == WL_CONNECTED) {
        WiFi.setSleep(false);
        sleepOff = true;
    }

    unsigned long now = millis();
    if (streamUntil == 0)
        return;
    if ((int32_t)(now - streamUntil) >= 0) {
        // the site stopped asking: the page was closed without saying so
        streamUntil = 0;
        Serial.println("[CAM] No request from the site, stopped sending frames");
        return;
    }
    if (now - lastSentAt < STREAM_INTERVAL_MS || !mqttConnected())
        return;

    size_t len = 0;
    Vision v;
    {
        LockGuard guard;
        if (sharedId != lastSentId && sharedLen) {
            len = sharedLen;
            lastSentId = sharedId;
            memcpy(sendJpeg, sharedJpeg, len);
        }
        v = current;
    }
    if (!len)
        return;
    lastSentAt = now;
    // the overlay goes first: the page draws it over the frame that follows
    publishCameraVision(visionJson(v));
    publishCameraFrame(sendJpeg, len);
}

} // namespace Camera

#else

// other boards have no camera
namespace Camera {
bool begin() { return false; }
bool ready() { return false; }
Vision vision() { return Vision{}; }
void onStreamRequest(const uint8_t *, unsigned int) {}
void loop() {}
} // namespace Camera

#endif
