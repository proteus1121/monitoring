package org.proteus1121.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;

/**
 * Display module wired to a controller. The firmware draws the same 128x64 screens on each of them.
 * Pins are GPIO numbers in the order of {@link #getPins()}.
 */
@Getter
@RequiredArgsConstructor
public enum DisplayModel {

    NONE("No display", "The board runs without a screen", List.of(), null),
    ST7565("ST7565 LCD 128x64", "Graphic LCD module over SPI", List.of("CLK", "DIN", "CS", "DC", "RST"), "SPI"),
    SSD1306("SSD1306 OLED 128x64", "0.96\" OLED over I2C, address 0x3C or 0x3D", List.of("SDA", "SCL"), "I2C"),
    SH1106("SH1106 OLED 128x64", "1.3\" OLED over I2C, address 0x3C or 0x3D", List.of("SDA", "SCL"), "I2C");

    private final String label;
    private final String description;
    private final List<String> pins;
    private final String bus;

    public boolean isI2c() {
        return "I2C".equals(bus);
    }
}
