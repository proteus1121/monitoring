package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DeviceType {

    TEMPERATURE("sensor/temperature"), 
    HUMIDITY("sensor/humidity"), 
    PRESSURE("sensor/pressure");
    
    private final String topic;
}
