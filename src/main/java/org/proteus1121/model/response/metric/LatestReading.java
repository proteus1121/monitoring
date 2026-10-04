package org.proteus1121.model.response.metric;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * The most recent value of a device; timestamp is server time (UTC).
 */
public record LatestReading(@Schema(requiredMode = REQUIRED) Long deviceId,
                            @Schema(requiredMode = REQUIRED) @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
                            LocalDateTime timestamp,
                            Double value) {
}
