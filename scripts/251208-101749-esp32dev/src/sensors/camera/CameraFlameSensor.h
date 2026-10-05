#ifndef CAMERA_FLAME_SENSOR_H
#define CAMERA_FLAME_SENSOR_H

#include "../ISensor.h"
#include "../../camera/Camera.h"

/**
 * Flame seen by the camera of an ESP32-CAM (camera/Camera.h): 1 while the detector's alarm lasts. The
 * module has no pins, the camera is on the board.
 */
class CameraFlameSensor : public ISensor {
public:
    void init() override {}

    bool read(const String &type, float &value) override {
        if (!Camera::ready())
            return false;
        value = Camera::vision().alarm ? 1.0f : 0.0f;
        return true;
    }

    bool isEventDriven() override { return true; }
};

#endif
