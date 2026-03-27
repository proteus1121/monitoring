package org.proteus1121.config.properties;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
@Component
@ConfigurationProperties(prefix = "llm")
@Data
public class LlmProperties {
    private boolean enabled = true;
    private String provider = "ollama";
    private String url = "http://localhost:11434/api/generate";
    private String model = "llama3.1";
    private long timeoutMs = 2000;
}
