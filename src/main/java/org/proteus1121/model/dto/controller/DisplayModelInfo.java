package org.proteus1121.model.dto.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import org.proteus1121.model.enums.DisplayModel;

import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

public record DisplayModelInfo(@Schema(requiredMode = REQUIRED) DisplayModel model,
                               @Schema(requiredMode = REQUIRED) String label,
                               @Schema(requiredMode = REQUIRED) String description,
                               @Schema(requiredMode = REQUIRED) List<String> pins,
                               String bus) {

    public static DisplayModelInfo of(DisplayModel model) {
        return new DisplayModelInfo(model, model.getLabel(), model.getDescription(), model.getPins(), model.getBus());
    }
}
