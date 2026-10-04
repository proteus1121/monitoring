package org.proteus1121.model.dto.device;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Raw ADC value an analog sensor last reported, used to calibrate it.
 */
public record RawReading(@Schema(requiredMode = REQUIRED) double value,
                         @Schema(requiredMode = REQUIRED) @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                         LocalDateTime timestamp) {
}
