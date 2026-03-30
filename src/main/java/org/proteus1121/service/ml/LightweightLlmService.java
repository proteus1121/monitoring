package org.proteus1121.service.ml;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.ml.IncidentContext;
import org.proteus1121.model.ml.IncidentMessage;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Lightweight rule-based LLM service for generating human-readable incident messages.
 * 
 * This service generates incident messages using simple rule-based patterns instead of
 * requiring an external LLM. It's designed for resource-constrained environments with
 * minimal memory footprint. No external models or REST calls required.
 */
@Slf4j
@Service
public class LightweightLlmService implements LocalLlmService {

    private static final double HIGH_THRESHOLD = 0.8;
    private static final double MEDIUM_THRESHOLD = 0.5;

    @Override
    public IncidentMessage generateMessage(IncidentContext ctx) {
        try {
            String title = generateTitle(ctx);
            String body = generateBody(ctx);
            log.debug("Generated message for device {}: {}", ctx.device().getId(), title);
            return new IncidentMessage(title, body);
        } catch (Exception ex) {
            log.warn("Message generation failed for device {}: {}", ctx.device().getId(), ex.getMessage());
            return fallbackMessage(ctx);
        }
    }

    private String generateTitle(IncidentContext ctx) {
        double prob = ctx.probability();
        String severity = prob > HIGH_THRESHOLD ? "Critical" : 
                         prob > MEDIUM_THRESHOLD ? "Warning" : "Alert";
        
        List<String> contributors = ctx.topContributors();
        String sensorSummary = summarizeSensors(contributors);
        
        String title = String.format("%s: %s - %s (%.0f%%)", 
            severity, 
            ctx.device().getName(),
            sensorSummary.isEmpty() ? "Environmental anomaly" : sensorSummary,
            prob * 100
        );
        
        // Trim to 80 chars max
        return title.length() > 80 ? title.substring(0, 77) + "..." : title;
    }

    private String generateBody(IncidentContext ctx) {
        StringBuilder body = new StringBuilder();
        double prob = ctx.probability();
        
        // Add severity-based recommendation
        if (prob > HIGH_THRESHOLD) {
            body.append("CRITICAL: Immediate investigation required. ");
        } else if (prob > MEDIUM_THRESHOLD) {
            body.append("WARNING: Please review device readings. ");
        } else {
            body.append("INFO: Anomaly detected. ");
        }
        
        // Add sensor-specific details
        Map<DeviceType, Double> values = ctx.latestValues();
        List<String> readings = new ArrayList<>();
        
        if (values.containsKey(DeviceType.TEMPERATURE)) {
            readings.add(String.format("Temp: %.1f°C", values.get(DeviceType.TEMPERATURE)));
        }
        if (values.containsKey(DeviceType.HUMIDITY)) {
            readings.add(String.format("Humidity: %.1f%%", values.get(DeviceType.HUMIDITY)));
        }
        if (values.containsKey(DeviceType.LPG)) {
            readings.add(String.format("LPG: %.2f ppm", values.get(DeviceType.LPG)));
        }
        if (values.containsKey(DeviceType.CH4)) {
            readings.add(String.format("CH4: %.2f ppm", values.get(DeviceType.CH4)));
        }
        if (values.containsKey(DeviceType.SMOKE)) {
            readings.add(String.format("Smoke: %.2f", values.get(DeviceType.SMOKE)));
        }
        if (values.containsKey(DeviceType.FLAME)) {
            double flame = values.get(DeviceType.FLAME);
            readings.add(flame > 0 ? "Flame: DETECTED" : "Flame: None");
        }
        if (values.containsKey(DeviceType.LIGHT)) {
            readings.add(String.format("Light: %.0f lux", values.get(DeviceType.LIGHT)));
        }
        if (values.containsKey(DeviceType.PRESSURE)) {
            readings.add(String.format("Pressure: %.1f hPa", values.get(DeviceType.PRESSURE)));
        }
        if (values.containsKey(DeviceType.MOTION)) {
            double motion = values.get(DeviceType.MOTION);
            readings.add(motion > 0 ? "Motion: DETECTED" : "Motion: None");
        }
        
        if (!readings.isEmpty()) {
            body.append("Current: ").append(String.join(", ", readings.stream()
                .limit(3)
                .toList())).append(". ");
        }
        
        // Add missing sensors info if relevant
        List<DeviceType> missing = ctx.missingSensors();
        if (!missing.isEmpty() && missing.size() <= 3) {
            body.append("Missing data: ").append(formatSensorNames(missing)).append(". ");
        }
        
        // Add action item
        body.append("Check device connection and sensor calibration.");
        
        // Trim to 200 chars max
        String result = body.toString();
        return result.length() > 200 ? result.substring(0, 197) + "..." : result;
    }

    private String summarizeSensors(List<String> sensors) {
        if (sensors.isEmpty()) {
            return "";
        }
        
        List<String> names = sensors.stream()
            .limit(2)
            .toList();
        
        return String.join(" + ", names);
    }

    private String formatSensorNames(List<DeviceType> sensors) {
        return String.join(", ", sensors.stream()
            .limit(2)
            .map(this::sensorDisplayName)
            .toList());
    }

    private String sensorDisplayName(DeviceType type) {
        return switch (type) {
            case TEMPERATURE -> "Temp";
            case HUMIDITY -> "Humidity";
            case LPG -> "LPG";
            case CH4 -> "CH4";
            case SMOKE -> "Smoke";
            case FLAME -> "Flame";
            case LIGHT -> "Light";
            case PRESSURE -> "Pressure";
            case MOTION -> "Motion";
            default -> type.name();
        };
    }

    private IncidentMessage fallbackMessage(IncidentContext ctx) {
        String title = String.format("Anomaly: %s (%.0f%%)", ctx.device().getName(), ctx.probability() * 100);
        String body = String.format("Environmental anomaly detected with %.1f%% confidence. Check device readings.", 
            ctx.probability() * 100);
        return new IncidentMessage(title, body);
    }
}
