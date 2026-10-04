package org.proteus1121.model.dto.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import org.proteus1121.model.enums.DisplayModel;

import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Display of a controller.
 *
 * @param pins GPIO numbers in the order of {@link DisplayModel#getPins()}
 * @param flip rotate the picture by 180 degrees
 */
public record DisplaySettings(@Schema(requiredMode = REQUIRED) DisplayModel model,
                              @Schema(requiredMode = REQUIRED) List<Integer> pins,
                              @Schema(requiredMode = REQUIRED) boolean flip) {

    /**
     * What the firmware uses before the site configured anything: the displays the boards shipped with.
     */
    public static DisplaySettings defaultFor(String platform) {
        if ("esp8266".equalsIgnoreCase(platform)) {
            // NodeMCU: CLK D5, DIN D6, CS D2, DC D7, RST D4; the module is mounted upside down
            return new DisplaySettings(DisplayModel.ST7565, List.of(14, 12, 4, 13, 2), true);
        }
        return new DisplaySettings(DisplayModel.SSD1306, List.of(27, 14), false);
    }
}
