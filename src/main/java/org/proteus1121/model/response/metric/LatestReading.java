package org.proteus1121.model.response.metric;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * The most recent value of a device; timestamp is server time (UTC).
 */
public record LatestReading(Long deviceId,
                            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
                            LocalDateTime timestamp,
                            Double value) {
}
