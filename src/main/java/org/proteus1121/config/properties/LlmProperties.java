package org.proteus1121.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Text generation for incident and device descriptions. Disabled while no API key is set.
 */
@Data
@Component
@ConfigurationProperties(prefix = "llm")
public class LlmProperties {

    /**
     * Language of the generated texts, as understood by the model ("Ukrainian", "English", ...).
     */
    private String language = "Ukrainian";

    private Gemini gemini = new Gemini();

    @Data
    public static class Gemini {
        private String apiKey;
        /**
         * The "latest" alias follows the current Flash model, so a model retirement needs no change here.
         */
        private String model = "gemini-flash-latest";
        /**
         * Used when the main model is overloaded or unavailable; the Lite model is less busy.
         */
        private String fallbackModel = "gemini-flash-lite-latest";
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        private int timeoutSeconds = 30;
    }

    public boolean isEnabled() {
        return gemini.getApiKey() != null && !gemini.getApiKey().isBlank();
    }
}
