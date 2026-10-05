package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;

/**
 * Hardware module wired to a controller (ESP board). One module can provide several measurements
 * (e.g. DHT11 gives temperature and humidity), each of them is a separate device with its own {@link DeviceType}.
 */
@Getter
@RequiredArgsConstructor
public enum SensorModel {

    DHT11("DHT11", "Temperature & humidity sensor", List.of(DeviceType.TEMPERATURE, DeviceType.HUMIDITY), List.of("DATA"), false, false),
    DHT22("DHT22", "Temperature & humidity sensor", List.of(DeviceType.TEMPERATURE, DeviceType.HUMIDITY), List.of("DATA"), false, false),
    MQ2("MQ-2", "Gas sensor (LPG, methane, smoke)", List.of(DeviceType.LPG, DeviceType.CH4, DeviceType.SMOKE), List.of("AO"), true, false),
    BMP180("BMP180", "Barometer over I2C", List.of(DeviceType.TEMPERATURE, DeviceType.PRESSURE), List.of("SDA", "SCL"), false, false),
    FLAME_IR("IR flame sensor", "Digital flame detector, active LOW", List.of(DeviceType.FLAME), List.of("DO"), false, false),
    LIGHT_DIGITAL("Light sensor (DO)", "Photoresistor module digital output, active LOW", List.of(DeviceType.LIGHT), List.of("DO"), false, false),
    PIR("PIR motion sensor", "Motion detector, active HIGH", List.of(DeviceType.MOTION), List.of("OUT"), false, false),
    DIGITAL_INPUT("Digital input", "Any digital input, HIGH = 1", List.of(DeviceType.DIGITAL), List.of("IN"), false, false),
    SOIL_MOISTURE("Soil moisture sensor", "Capacitive or resistive probe, % of water in the soil", List.of(DeviceType.SOIL_MOISTURE), List.of("AO"), true, false),
    ANALOG_INPUT("Analog input", "Raw ADC value", List.of(DeviceType.ANALOG, DeviceType.LIGHT), List.of("AO"), true, false),
    RELAY("Relay / digital output", "Output controlled from UI, HIGH = on", List.of(DeviceType.RELAY), List.of("IN"), false, true),
    // the camera of an ESP32-CAM: the board detects flame in its picture, no pins to wire
    CAMERA("ESP32-CAM camera", "Flame detected in the camera image on the board, live view on the Cameras page", List.of(DeviceType.FLAME), List.of(), false, false);

    private final String label;
    private final String description;
    private final List<DeviceType> supportedTypes;
    private final List<String> pins;
    private final boolean analog;
    private final boolean output;

    public boolean supports(DeviceType type) {
        return supportedTypes.contains(type);
    }

    /**
     * A module on the board itself (the camera): configured without pins.
     */
    public boolean isPinless() {
        return pins.isEmpty();
    }
}
