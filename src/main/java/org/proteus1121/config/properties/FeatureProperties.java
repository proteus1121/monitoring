package org.proteus1121.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "features")
@Data
public class FeatureProperties {
    private long windowMinutes = 5;
    private Map<String, Double> defaultImpute = createDefaultImpute();

    private static Map<String, Double> createDefaultImpute() {
        Map<String, Double> defaults = new HashMap<>();
        defaults.put("temperature", 22.0);
        defaults.put("humidity", 45.0);
        defaults.put("lpg", 0.0);
        defaults.put("ch4", 0.0);
        defaults.put("smoke", 0.0);
        defaults.put("flame", 0.0);
        defaults.put("light", 200.0);
        defaults.put("pressure", 1013.0);
        defaults.put("motion", 0.0);
        return defaults;
    }
}
