package org.proteus1121.model.dto.controller;

import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;

import java.util.List;

public record SensorModelInfo(SensorModel model, String label, String description, List<DeviceType> supportedTypes,
                              List<String> pins, boolean analog, boolean output) {

    public static SensorModelInfo of(SensorModel model) {
        return new SensorModelInfo(model, model.getLabel(), model.getDescription(), model.getSupportedTypes(),
                model.getPins(), model.isAnalog(), model.isOutput());
    }
}
