package org.proteus1121.model.dto.device;

import lombok.Data;

@Data
public class Thermometer implements MeasurementDevice {

    private String name;
    private Integer criticalValue;

}
