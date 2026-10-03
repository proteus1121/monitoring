package org.proteus1121.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.controller.BoardScan;
import org.proteus1121.model.dto.controller.BoardScan.Finding;
import org.proteus1121.model.dto.controller.BoardScan.Kind;
import org.proteus1121.model.dto.controller.BoardScan.Option;
import org.proteus1121.model.dto.controller.BoardScan.SuggestedDevice;
import org.proteus1121.model.dto.controller.DisplaySettings;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.DisplayModel;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "Scan board": asks the board over MQTT to look for modules on its free pins (see the firmware's
 * system/Scanner.h) and turns the answer into suggestions. Results are kept in memory, the last one per board.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BoardScanService {

    static final Duration TIMEOUT = Duration.ofSeconds(30);

    // digital modules the firmware drives on one pin, offered when "something" is on a pin
    private static final List<SensorModel> DIGITAL_MODELS =
            List.of(SensorModel.FLAME_IR, SensorModel.LIGHT_DIGITAL, SensorModel.PIR, SensorModel.DIGITAL_INPUT);
    private static final List<SensorModel> ANALOG_MODELS = List.of(SensorModel.MQ2, SensorModel.ANALOG_INPUT);

    private final ControllerService controllerService;
    private final ControllerRepository controllerRepository;
    private final ControllerPublisher controllerPublisher;
    private final ObjectMapper objectMapper;

    private record State(String requestId, BoardScan scan) {
    }

    private final Map<Long, State> scans = new ConcurrentHashMap<>();

    public BoardScan request(Long controllerId, Long userId) {
        ControllerEntity controller = controllerService.checkController(controllerId, userId);
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        BoardScan scan = new BoardScan(BoardScan.Status.PENDING, LocalDateTime.now(), null, List.of(), List.of());
        scans.put(controllerId, new State(requestId, scan));
        controllerPublisher.publishScanRequest(controller.getUserId(), controller.getHardwareId(), requestId);
        return scan;
    }

    /**
     * Last scan of the board, null when it was never scanned since the server started.
     */
    public BoardScan get(Long controllerId, Long userId) {
        controllerService.checkController(controllerId, userId);
        State state = scans.get(controllerId);
        if (state == null) {
            return null;
        }
        BoardScan scan = state.scan();
        if (scan.status() == BoardScan.Status.PENDING && scan.requestedAt().plus(TIMEOUT).isBefore(LocalDateTime.now())) {
            return new BoardScan(BoardScan.Status.TIMEOUT, scan.requestedAt(), null, List.of(), List.of());
        }
        return scan;
    }

    public void handleResult(Long userId, String hardwareId, String payload) {
        ControllerEntity controller = controllerRepository.findByHardwareId(hardwareId).orElse(null);
        if (controller == null || !Objects.equals(controller.getUserId(), userId)) {
            log.warn("Scan result from unknown board {} of user {}", hardwareId, userId);
            return;
        }
        try {
            JsonNode result = objectMapper.readTree(payload);
            State state = scans.get(controller.getId());
            LocalDateTime requestedAt = state == null ? LocalDateTime.now() : state.scan().requestedAt();
            List<Integer> scanned = new ArrayList<>();
            result.path("pins").forEach(pin -> scanned.add(pin.asInt()));
            List<Finding> findings = new ArrayList<>();
            result.path("found").forEach(found -> findings.add(toFinding(found)));
            BoardScan scan = new BoardScan(BoardScan.Status.DONE, requestedAt, LocalDateTime.now(), scanned, findings);
            scans.put(controller.getId(), new State(result.path("id").asText(null), scan));
            log.info("Board {} scanned: {} findings", hardwareId, findings.size());
        } catch (Exception e) {
            log.error("Cannot read scan result of board {}: {}", hardwareId, payload, e);
        }
    }

    Finding toFinding(JsonNode found) {
        List<Integer> pins = new ArrayList<>();
        found.path("p").forEach(pin -> pins.add(pin.asInt()));
        Integer pin = pins.isEmpty() ? null : pins.get(0);
        Integer secondPin = pins.size() > 1 ? pins.get(1) : null;
        Map<String, Double> readings = new LinkedHashMap<>();

        switch (found.path("k").asText()) {
            case "dht" -> {
                SensorModel model = "DHT22".equals(found.path("m").asText()) ? SensorModel.DHT22 : SensorModel.DHT11;
                putReading(readings, DeviceType.TEMPERATURE.name(), found.path("t"));
                putReading(readings, DeviceType.HUMIDITY.name(), found.path("h"));
                return new Finding(Kind.SENSOR, model.getLabel(), pins, readings, null,
                        List.of(option(model, pin, null)), null);
            }
            case "bmp180" -> {
                putReading(readings, DeviceType.TEMPERATURE.name(), found.path("t"));
                putReading(readings, DeviceType.PRESSURE.name(), found.path("pr"));
                return new Finding(Kind.SENSOR, SensorModel.BMP180.getLabel(), pins, readings, null,
                        List.of(option(SensorModel.BMP180, pin, secondPin)), null);
            }
            case "i2c" -> {
                String name = found.path("n").asText("");
                String address = "0x%02X".formatted(found.path("a").asInt());
                if ("oled".equals(name)) {
                    return new Finding(Kind.DISPLAY, "OLED display", pins, readings,
                            "I2C address " + address + ". SSD1306 is the usual chip, choose SH1106 for 1.3\" modules.",
                            List.of(), new DisplaySettings(DisplayModel.SSD1306, pins, false));
                }
                String title = switch (name) {
                    case "bmp280" -> "BMP280 barometer";
                    case "bme280" -> "BME280 sensor";
                    case "bh1750" -> "BH1750 light sensor";
                    default -> "I2C device at " + address;
                };
                return new Finding(Kind.UNSUPPORTED, title, pins, readings,
                        "Answers at " + address + ", the firmware has no driver for it yet.", List.of(), null);
            }
            case "analog" -> {
                putReading(readings, "ANALOG", found.path("v"));
                return new Finding(Kind.CHOOSE, "Analog signal", pins, readings,
                        "Something sets a voltage on this ADC pin. Choose the module.",
                        ANALOG_MODELS.stream().map(model -> option(model, pin, null)).toList(), null);
            }
            default -> {
                putReading(readings, "LEVEL", found.path("l"));
                return new Finding(Kind.CHOOSE, "Digital signal", pins, readings,
                        "A module pulls or drives this pin. Choose which one it is.",
                        DIGITAL_MODELS.stream().map(model -> option(model, pin, null)).toList(), null);
            }
        }
    }

    /**
     * Devices a module gives: every measurement of a multi-sensor (DHT, MQ-2, BMP180), the first one otherwise.
     */
    private Option option(SensorModel model, Integer pin, Integer secondPin) {
        List<DeviceType> types = model == SensorModel.ANALOG_INPUT
                ? List.of(model.getSupportedTypes().get(0))
                : model.getSupportedTypes();
        List<SuggestedDevice> devices = types.stream()
                .map(type -> new SuggestedDevice(
                        model.getPins().size() > 1 || types.size() > 1
                                ? shortLabel(model) + " " + type.name().toLowerCase(Locale.ROOT)
                                : shortLabel(model),
                        type, model, pin, model.getPins().size() > 1 ? secondPin : null))
                .toList();
        return new Option(model, model.getLabel(), devices);
    }

    private static String shortLabel(SensorModel model) {
        return switch (model) {
            case FLAME_IR -> "Flame sensor";
            case LIGHT_DIGITAL -> "Light sensor";
            case PIR -> "Motion sensor";
            case DIGITAL_INPUT -> "Digital input";
            case ANALOG_INPUT -> "Analog input";
            case RELAY -> "Relay";
            default -> model.getLabel();
        };
    }

    private static void putReading(Map<String, Double> readings, String key, JsonNode value) {
        if (value.isNumber() || (value.isTextual() && !value.asText().isBlank())) {
            readings.put(key, value.asDouble());
        }
    }
}
