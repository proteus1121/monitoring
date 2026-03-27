package org.proteus1121.service.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.LlmProperties;
import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Fallback LLM service when Ollama is disabled or unavailable
 * Provides basic template-based messages
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "llm.enabled", havingValue = "false")
public class FallbackLlmService implements LocalLlmService {

    @Override
    public IncidentMessage generateMessage(IncidentContext ctx) {
        String title = generateTitle(ctx);
        String body = generateBody(ctx);
        return new IncidentMessage(title, body);
    }

    private String generateTitle(IncidentContext ctx) {
        double probability = ctx.probability() * 100;
        return String.format("Environmental Anomaly: %s (%.0f%%)", ctx.device().getName(), probability);
    }

    private String generateBody(IncidentContext ctx) {
        StringBuilder body = new StringBuilder();
        body.append(String.format("Anomaly detected with %.1f%% confidence.\n", ctx.probability() * 100));
        
        // Add top readings
        if (!ctx.latestValues().isEmpty()) {
            body.append("Latest readings: ");
            ctx.latestValues().entrySet().stream()
                .limit(3)
                .forEach(e -> body.append(String.format("%s=%.1f ", e.getKey().name(), e.getValue())));
            body.append("\n");
        }

        // Add contributing factors
        if (!ctx.topContributors().isEmpty()) {
            body.append("Contributing factors: ");
            body.append(String.join(", ", ctx.topContributors().stream().limit(2).toList()));
        }

        return body.toString();
    }
}

