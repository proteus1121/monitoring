package org.proteus1121.service.llm;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.config.properties.LlmProperties;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Texts written by the language model: incident explanations and device descriptions.
 * Prompts contain only sensor names, values and thresholds.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TextGenerationService {

    /**
     * devices.description is VARCHAR(255).
     */
    public static final int DEVICE_DESCRIPTION_LIMIT = 255;

    private final GeminiClient client;
    private final LlmProperties properties;

    public boolean isEnabled() {
        return client.isEnabled();
    }

    public String model() {
        return client.model();
    }

    public String lastError() {
        return client.lastError();
    }

    /**
     * Facts about one sensor for the prompts.
     */
    public record SensorFacts(String name, String type, String unit, String module, String board, String pin,
                              Double lowerThreshold, Double upperThreshold) {
    }

    /**
     * @param value      the reading that raised the incident
     * @param recent     recent hourly averages of the device, oldest first
     * @param neighbours "name (type): value unit" lines of the other sensors of the user
     */
    public Optional<String> describeIncident(String title, SensorFacts sensor, double value, List<Double> recent,
                                             List<String> neighbours) {
        String system = """
                You are the assistant of an IoT environment monitoring system (gas, smoke, flame, temperature, humidity,
                light, motion sensors on ESP boards). Explain an incident to the owner of the sensors.
                Write in %s, plain text without Markdown, 3 to 6 short sentences:
                what happened, the most likely causes given the other sensors and the recent trend,
                and what to check or do now. If the reading looks like a sensor fault (for example -1, a sudden jump
                or a value outside the physical range), say so. Do not invent facts that are not in the data.
                """.formatted(properties.getLanguage());

        StringBuilder prompt = new StringBuilder();
        prompt.append("Incident: ").append(title).append('\n');
        prompt.append(describe(sensor)).append('\n');
        prompt.append("Reading that raised the incident: ").append(format(value)).append(' ').append(unit(sensor)).append('\n');
        if (!recent.isEmpty()) {
            prompt.append("Hourly averages of this sensor for the last hours, oldest first: ")
                    .append(String.join(", ", recent.stream().map(TextGenerationService::format).toList())).append('\n');
        }
        if (!neighbours.isEmpty()) {
            prompt.append("Current readings of the other sensors:\n");
            neighbours.forEach(line -> prompt.append("- ").append(line).append('\n'));
        }
        return client.generate(system, prompt.toString());
    }

    public Optional<String> describeDevice(SensorFacts sensor) {
        String system = """
                You write short descriptions of sensors for an IoT monitoring dashboard.
                Write in %s, plain text without Markdown, one or two sentences, at most 200 characters:
                what the sensor measures and why it matters here, mentioning the module and the board pin if given.
                """.formatted(properties.getLanguage());
        return client.generate(system, describe(sensor))
                .map(text -> text.length() > DEVICE_DESCRIPTION_LIMIT
                        ? text.substring(0, DEVICE_DESCRIPTION_LIMIT - 1) + "…"
                        : text);
    }

    private static String describe(SensorFacts sensor) {
        StringBuilder text = new StringBuilder("Sensor \"").append(sensor.name()).append('"');
        if (sensor.type() != null) text.append(", measures ").append(sensor.type().toLowerCase());
        if (sensor.unit() != null && !sensor.unit().isBlank()) text.append(" in ").append(sensor.unit());
        if (sensor.module() != null) text.append(", module ").append(sensor.module());
        if (sensor.board() != null) text.append(", board ").append(sensor.board());
        if (sensor.pin() != null) text.append(", pin ").append(sensor.pin());
        if (sensor.lowerThreshold() != null) text.append(", lower threshold ").append(format(sensor.lowerThreshold()));
        if (sensor.upperThreshold() != null) text.append(", upper threshold ").append(format(sensor.upperThreshold()));
        return text.append('.').toString();
    }

    private static String unit(SensorFacts sensor) {
        return sensor.unit() == null ? "" : sensor.unit();
    }

    private static String format(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : "%.2f".formatted(value);
    }
}
