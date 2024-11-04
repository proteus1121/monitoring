package org.proteus1121.model.enums;

public enum DeviceStatus {
    OK, //The device is operating within normal parameters, below the critical value.
    WARNING, // The device is approaching the critical threshold but has not yet exceeded it. This could act as a pre-alert, letting users know they should monitor the device closely.
    CRITICAL, //The device has exceeded its critical value and likely needs immediate attention or intervention.
    OFFLINE // device is disconnected
}
