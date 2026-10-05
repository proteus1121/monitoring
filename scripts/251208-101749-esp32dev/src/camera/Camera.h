#ifndef CAMERA_H
#define CAMERA_H

#include <Arduino.h>

/**
 * AI-Thinker ESP32-CAM (OV2640): the camera, flame detection in its picture and the live view on the site.
 * Built only for the esp32cam env (CAMERA_BOARD).
 *
 * Detection runs on the board all the time, whether anybody watches or not, in two FreeRTOS tasks: one takes
 * frames from the sensor, the other analyses the newest one (frames it is too slow for are skipped, not
 * queued). The rule is the one of the flame monitor (calculations/fire-sim-image, fire_live.ino):
 *  - spatial: a pixel is flame-coloured when it is bright (V >= 180), saturated (S >= 80), red over blue by
 *    30, green not over red by 20, hue red..yellow; the share of such pixels is the ratio r;
 *  - temporal: r must reach 0.004 and flicker (variance of r over the last 8 frames >= 5e-6), confirmed by a
 *    counter over 3 frames.
 * The QVGA frame is decoded at full scale and every 4th pixel analysed (19,200 samples, about 9 analysed
 * frames a second), the pipeline the paper's thresholds were validated on.
 * Changed against the monitor, from the revision's experiments:
 *  - the alarm is latched (E16, V3): raised when the counter is full, cleared only when it falls back to 0
 *    and not before 3 s after the counter was last full. A flame near the threshold no longer switches the
 *    alarm tens of times a minute; on the FIRESENSE videos false-alarm episodes fell from 4.5 to 2.6 a
 *    minute with the same detections.
 * The alarm is the FLAME device of the CAMERA module (sensors/camera/CameraFlameSensor.h): 1 while it lasts,
 * published at once, so the site's alerts and notifications work as for an IR flame sensor.
 *
 * Live view: frames go to the site only while somebody has the Cameras page open, through the broker the
 * board already uses (no port has to be opened on the router):
 *   subscribe users/<userId>/controllers/<hardwareId>/stream  "1" send frames for the next 30 s, "0" stop
 *   publish   users/<userId>/controllers/<hardwareId>/frame   the camera's JPEG as it is, no re-encoding
 *   publish   users/<userId>/controllers/<hardwareId>/vision  what the detector sees, with every frame:
 *             {"a":0,"r":0.0012,"var":3.1e-7,"c":1,"n":3,"b":[x1,y1,x2,y2],"w":320,"h":240,"fps":8.9,
 *              "cfps":19.7,"m":[r,g,b]}  b in the w x h analysed frame, absent without flame-coloured pixels;
 *             m the mean colour of the analysed frame, for checking the channel order against the JPEG
 *   publish   users/<userId>/controllers/<hardwareId>/snapshot the frame the alarm was raised on, after its
 *             vision, also when nobody watches: the site attaches it, with the flame's box, to the alerts
 */
namespace Camera {

struct Vision {
    bool alarm;
    float ratio;
    float variance;
    uint8_t consec;
    bool bboxValid;
    uint16_t bx1, by1, bx2, by2;
    // analysed frame
    uint16_t width, height;
    // analysed frames per second, frames taken from the sensor per second
    float fps;
    float cameraFps;
    uint32_t frame;
    uint8_t mean[3];
};

// Starts the camera and the detection; false when the camera does not answer (the board then works without it).
bool begin();
bool ready();
Vision vision();
// payload of the stream topic
void onStreamRequest(const uint8_t *payload, unsigned int length);
// sends the newest frame when the site asked for frames; call from loop()
void loop();

} // namespace Camera

#endif
