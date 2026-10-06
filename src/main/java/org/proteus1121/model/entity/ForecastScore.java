package org.proteus1121.model.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Result of the last forecast run of one model: error on the held-out last hours.
 */
@Data
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
public class ForecastScore {

    @Column(name = "mae")
    private Double mae;

    @Column(name = "rmse")
    private Double rmse;

    @Column(name = "updated_at")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
