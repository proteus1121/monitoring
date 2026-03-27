package org.proteus1121.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "ml")
@Data
public class MlProperties {
    private boolean enabled = true;
    private String modelPath = "file:./models/environmental_xgb.json";
    private double threshold = 0.72;
    private String provider = "xgboost4j";
    private ExternalProperties external = new ExternalProperties();

    @Data
    public static class ExternalProperties {
        private String url = "http://localhost:8089/score";
        private long timeoutMs = 1200;
    }
}

