package org.proteus1121.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.LlmProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Minimal client of the Gemini generateContent REST endpoint. Never throws: any failure (no key,
 * quota, timeout) is logged and reported as an empty result so callers fall back to plain texts.
 */
@Slf4j
@Component
public class GeminiClient {

    private final LlmProperties properties;
    private final RestTemplate restTemplate;

    public GeminiClient(LlmProperties properties, RestTemplateBuilder builder) {
        this.properties = properties;
        Duration timeout = Duration.ofSeconds(properties.getGemini().getTimeoutSeconds());
        this.restTemplate = builder.setConnectTimeout(Duration.ofSeconds(5)).setReadTimeout(timeout).build();
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public String model() {
        return properties.getGemini().getModel();
    }

    public Optional<String> generate(String systemInstruction, String prompt) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        LlmProperties.Gemini gemini = properties.getGemini();
        String url = "%s/models/%s:generateContent".formatted(gemini.getBaseUrl(), gemini.getModel());

        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                // thinking models spend part of the output budget on reasoning, keep room for the answer
                "generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 4096));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", gemini.getApiKey());

        try {
            JsonNode response = restTemplate.postForObject(url, new HttpEntity<>(body, headers), JsonNode.class);
            StringBuilder text = new StringBuilder();
            if (response != null) {
                for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
                    if (part.path("thought").asBoolean(false)) continue;
                    text.append(part.path("text").asText(""));
                }
            }
            String result = text.toString().trim();
            if (result.isEmpty()) {
                log.warn("Gemini returned no text: {}", response == null ? null : response.path("candidates").path(0).path("finishReason"));
                return Optional.empty();
            }
            return Optional.of(result);
        } catch (Exception e) {
            log.warn("Gemini request failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
