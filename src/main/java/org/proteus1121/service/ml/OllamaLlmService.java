package org.proteus1121.service.ml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.LlmProperties;
import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * Ollama-based LLM service for generating human-readable incident messages.
 * 
 * This service connects to a local Ollama instance to generate human-readable
 * incident messages from structured anomaly context. It uses JSON request/response
 * format and includes robust retry logic for JSON parsing failures.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "llm.provider", havingValue = "ollama", matchIfMissing = true)
public class OllamaLlmService implements LocalLlmService {

    private final LlmProperties props;
    private final ObjectMapper objectMapper;
    private final RestTemplateBuilder restTemplateBuilder;
    private RestTemplate restTemplate;

    /**
     * Initialize the REST template with LLM-specific timeouts from configuration.
     */
    @jakarta.annotation.PostConstruct
    void init() {
        this.restTemplate = restTemplateBuilder
            .setReadTimeout(Duration.ofMillis(props.getTimeoutMs()))
            .setConnectTimeout(Duration.ofMillis(props.getTimeoutMs()))
            .build();
        log.info("OllamaLlmService initialized with timeout: {}ms", props.getTimeoutMs());
    }

    @Override
    public IncidentMessage generateMessage(IncidentContext ctx) {
        if (!props.isEnabled()) {
            return fallbackMessage(ctx);
        }

        String system = """
            You generate concise, actionable incident messages for IoT environmental anomalies.
            Respond strictly as compact JSON: {"title": "...", "body": "..."} with no extra text or markdown.
            Title max 80 chars. Body max 200 chars. Reference sensor combinations e.g. "High temp + low humidity + elevated LPG".
            """;
        
        String user = buildUserPrompt(ctx);
        
        Map<String, Object> request = Map.of(
            "model", props.getModel(),
            "prompt", system + "\n\n" + user,
            "stream", false,
            "options", Map.of("temperature", 0.2)
        );

        try {
            long startTime = System.currentTimeMillis();
            var response = restTemplate.postForEntity(props.getUrl(), request, Map.class);
            long elapsed = System.currentTimeMillis() - startTime;
            
            if (response.getBody() == null) {
                log.warn("Ollama returned null response");
                return fallbackMessage(ctx);
            }

            String responseText = (String) response.getBody().get("response");
            log.debug("Ollama generation took {}ms", elapsed);
            
            return parseJsonWithRetry(responseText, ctx);
        } catch (Exception ex) {
            log.warn("Ollama LLM generation failed for device {}: {}", ctx.device().getId(), ex.getMessage());
            return fallbackMessage(ctx);
        }
    }

    private String buildUserPrompt(IncidentContext ctx) {
        String latestValuesStr = ctx.latestValues().entrySet().stream()
            .map(e -> e.getKey().name() + "=" + String.format("%.2f", e.getValue()))
            .reduce((a, b) -> a + ", " + b)
            .orElse("unknown");

        String topContributorsStr = String.join(", ", ctx.topContributors().stream()
            .limit(3)
            .toList());

        String missingSensorsStr = ctx.missingSensors().stream()
            .map(Enum::name)
            .reduce((a, b) -> a + ", " + b)
            .orElse("none");

        return String.format("""
            Device: %s (%s)
            Anomaly Probability: %.1f%%
            Latest readings: %s
            Top contributing factors: %s
            Missing sensors: %s
            
            Generate a brief, actionable incident title (max 80 chars) and body (max 200 chars) describing the anomaly and recommended action.
            """,
            ctx.device().getName(),
            ctx.device().getType().name(),
            ctx.probability() * 100,
            latestValuesStr,
            topContributorsStr.isEmpty() ? "system-computed" : topContributorsStr,
            missingSensorsStr
        );
    }

    private IncidentMessage parseJsonWithRetry(String raw, IncidentContext ctx) {
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                // Clean up common formatting issues
                String cleaned = raw.replaceAll("```json|```|\\\\n", "").trim();
                
                JsonNode node = objectMapper.readTree(cleaned);
                String title = node.get("title").asText();
                String body = node.get("body").asText();
                
                if (!title.isBlank() && !body.isBlank()) {
                    return new IncidentMessage(title, body);
                }
            } catch (Exception e) {
                if (attempt == 0) {
                    log.debug("JSON parsing attempt {} failed, retrying: {}", attempt + 1, e.getMessage());
                } else {
                    log.debug("JSON parsing failed after {} attempts", attempt + 1);
                }
            }
        }
        
        return fallbackMessage(ctx);
    }

    private IncidentMessage fallbackMessage(IncidentContext ctx) {
        String title = String.format("Anomaly: %s (%.0f%%)", ctx.device().getName(), ctx.probability() * 100);
        String body = String.format("An environmental anomaly was detected with %.1f%% confidence. Review device readings and investigate.", 
            ctx.probability() * 100);
        return new IncidentMessage(title, body);
    }
}
