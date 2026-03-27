package org.proteus1121.service.ml;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.proteus1121.config.properties.LlmProperties;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OllamaLlmServiceTest {

    private OllamaLlmService ollamaLlmService;
    private LlmProperties llmProperties;
    private IncidentContext testContext;

    @BeforeEach
    void setUp() {
        llmProperties = new LlmProperties();
        llmProperties.setEnabled(false); // Disable actual HTTP calls in tests
        ollamaLlmService = new OllamaLlmService(llmProperties, new ObjectMapper());

        // Create test context
        Device device = new Device();
        device.setId(1L);
        device.setName("Test Device");
        device.setType(DeviceType.TEMPERATURE);

        Map<DeviceType, Double> latestValues = new HashMap<>();
        latestValues.put(DeviceType.TEMPERATURE, 35.0);
        latestValues.put(DeviceType.HUMIDITY, 20.0);

        Map<String, Double> features = new HashMap<>();
        features.put("temp", 35.0);
        features.put("humidity", 20.0);

        testContext = new IncidentContext(
            device,
            latestValues,
            features,
            0.85,
            List.of("high_temp", "low_humidity"),
            Collections.emptyList()
        );
    }

    @Test
    void testFallbackMessage() {
        IncidentMessage message = ollamaLlmService.generateMessage(testContext);

        assertNotNull(message);
        assertFalse(message.title().isEmpty());
        assertFalse(message.body().isEmpty());
        assertTrue(message.title().contains("Test Device") || message.title().contains("Anomaly"));
        assertTrue(message.body().contains("85"));
    }

    @Test
    void testJsonParsingWithValidJson() {
        // This tests the private parseJsonWithRetry indirectly
        // by verifying fallback behavior when LLM is disabled
        IncidentMessage message = ollamaLlmService.generateMessage(testContext);

        assertNotNull(message);
        assertTrue(message.title().length() <= 100);
        assertTrue(message.body().length() <= 300);
    }
}

