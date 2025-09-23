package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeviceType {

    TEMPERATURE("sensor/temperature"), 
    HUMIDITY("sensor/humidity"), 
    LPG("sensor/lpg"),
    CH4("sensor/ch4"),
    SMOKE("sensor/smoke"),
    FLAME("sensor/flame"),
    LIGHT("sensor/light");
    
    private final String topic;
}
