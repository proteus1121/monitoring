package org.proteus1121.service.ml;

import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.ml.IncidentContext;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LightweightLlmServiceTest {

    private final LightweightLlmService service = new LightweightLlmService(new RuleBasedAnomalyDetectionService());

    @Test
    void titleSaysWhatFiredNotTheLargestValues() {
        // pressure and light are the defaults put in for missing sensors: they used to make the title
        Map<String, Double> features = Map.of("flame", 1.0, "pressure", 1013.0, "light", 200.0, "temp", 22.0,
                "humidity", 45.0);

        assertEquals("Полум'я в кадрі: виявлено полум’я", title("Полум'я в кадрі", features));
    }

    @Test
    void severalReasonsAreListed() {
        Map<String, Double> features = Map.of("temp", 52.5, "humidity", 15.0);

        assertEquals("Кухня: температура 52.5 °C поза нормою 0…45 °C; вологість 15 % поза нормою 20…80 %",
                title("Кухня", features));
    }

    private String title(String deviceName, Map<String, Double> features) {
        Device device = new Device();
        device.setId(1L);
        device.setName(deviceName);
        device.setType(DeviceType.FLAME);
        return service.generateMessage(new IncidentContext(device, Map.of(), features, 0.95, List.of(), List.of()))
                .title();
    }
}
