package org.proteus1121.service.ml;

import org.proteus1121.model.ml.AnomalyContext;

public interface AnomalyDetectionService {
    /**
     * Score the anomaly context and return a probability [0..1]
     */
    double score(AnomalyContext ctx);

    /**
     * Check if the context is anomalous based on the threshold
     */
    default boolean isAnomalous(AnomalyContext ctx, double threshold) {
        return score(ctx) >= threshold;
    }
}
