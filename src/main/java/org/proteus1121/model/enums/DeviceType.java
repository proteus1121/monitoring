package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeviceType {

    TEMPERATURE,
    HUMIDITY,
    LPG,
    CH4,
    SMOKE,
    FLAME,
    LIGHT,
    PRESSURE,
    MOTION,
    DIGITAL,
    ANALOG,
    RELAY,
    // % of water in the soil, 0 dry .. 100 in water
    SOIL_MOISTURE,
    UNKNOWN;

}
