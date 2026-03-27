package org.proteus1121.service.ml;

import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;

public interface LocalLlmService {
    /**
     * Generate a human-readable incident message from the incident context
     */
    IncidentMessage generateMessage(IncidentContext ctx);
}

