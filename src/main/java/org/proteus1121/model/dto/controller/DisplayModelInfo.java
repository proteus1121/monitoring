package org.proteus1121.model.dto.controller;

import org.proteus1121.model.enums.DisplayModel;

import java.util.List;

public record DisplayModelInfo(DisplayModel model, String label, String description, List<String> pins, String bus) {

    public static DisplayModelInfo of(DisplayModel model) {
        return new DisplayModelInfo(model, model.getLabel(), model.getDescription(), model.getPins(), model.getBus());
    }
}
