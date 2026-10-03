package org.proteus1121.service.llm;

import org.springframework.web.client.HttpStatusCodeException;
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
    // last failure (status and Google's message, never the key) for the status endpoint
    private volatile String lastError;

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

    public String lastError() {
        return lastError;
    }

    /**
     * Tries the configured model, then the fallback model; overload (503) and rate limit (429) errors are
     * retried once after a pause, as the free tier often answers "high demand" for a few seconds.
     */
    public Optional<String> generate(String systemInstruction, String prompt) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        LlmProperties.Gemini gemini = properties.getGemini();
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                // thinking models spend part of the output budget on reasoning, keep room for the answer
                "generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 4096));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", gemini.getApiKey());
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        List<String> models = gemini.getFallbackModel() == null || gemini.getFallbackModel().isBlank()
                || gemini.getFallbackModel().equals(gemini.getModel())
                ? List.of(gemini.getModel())
                : List.of(gemini.getModel(), gemini.getFallbackModel());
        for (String model : models) {
            for (int attempt = 1; attempt <= 2; attempt++) {
                Attempt result = call(gemini.getBaseUrl(), model, request);
                if (result.text() != null) {
                    lastError = null;
                    return Optional.of(result.text());
                }
                if (!result.retryable()) break;
                sleep(attempt * 2000L);
            }
        }
        return Optional.empty();
    }

    private record Attempt(String text, boolean retryable) {
    }

    private Attempt call(String baseUrl, String model, HttpEntity<Map<String, Object>> request) {
        String url = "%s/models/%s:generateContent".formatted(baseUrl, model);
        try {
            JsonNode response = restTemplate.postForObject(url, request, JsonNode.class);
            StringBuilder text = new StringBuilder();
            if (response != null) {
                for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
                    if (part.path("thought").asBoolean(false)) continue;
                    text.append(part.path("text").asText(""));
                }
            }
            String result = text.toString().trim();
            if (result.isEmpty()) {
                lastError = model + ": no text in the answer, finishReason "
                        + (response == null ? null : response.path("candidates").path(0).path("finishReason").asText())
                        + ", promptFeedback " + (response == null ? null : response.path("promptFeedback"));
                log.warn("Gemini returned no text: {}", lastError);
                return new Attempt(null, false);
            }
            return new Attempt(result, false);
        } catch (HttpStatusCodeException e) {
            String error = e.getResponseBodyAsString();
            lastError = model + ": " + e.getStatusCode() + " " + (error.length() > 500 ? error.substring(0, 500) : error);
            log.warn("Gemini request failed: {}", lastError);
            int status = e.getStatusCode().value();
            return new Attempt(null, status == 429 || status >= 500);
        } catch (Exception e) {
            lastError = model + ": " + e.getClass().getSimpleName() + ": " + e.getMessage();
            log.warn("Gemini request failed: {}", lastError);
            return new Attempt(null, true);
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
