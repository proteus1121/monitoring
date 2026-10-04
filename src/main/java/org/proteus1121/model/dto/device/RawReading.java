package org.proteus1121.model.dto.device;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * Raw ADC value an analog sensor last reported, used to calibrate it.
 */
public record RawReading(double value,
                         @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
                         LocalDateTime timestamp) {
}
