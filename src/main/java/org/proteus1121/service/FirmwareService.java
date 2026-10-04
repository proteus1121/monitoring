package org.proteus1121.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.dto.controller.FirmwareUpdateStatus;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Firmware published by CI with the site (/firmware/manifest.json, see the firmware's
 * tools/firmware_manifest.py) and updates of boards to it, ordered from the site and run by the board itself
 * (firmware system/FirmwareUpdate.h).
 */
@Slf4j
@Service
public class FirmwareService {

    private static final Duration MANIFEST_TTL = Duration.ofMinutes(5);
    // a board that does not report within this time is offline or runs firmware without updates
    static final Duration ANSWER_TIMEOUT = Duration.ofSeconds(60);

    private final String manifestUrl;
    private final RestTemplate restTemplate;
    private final ControllerRepository controllerRepository;
    private final ControllerPublisher controllerPublisher;
    private final ControllerService controllerService;
    private final ObjectMapper objectMapper;

    private volatile JsonNode manifest;
    private volatile Instant manifestLoadedAt = Instant.EPOCH;
    private final Map<Long, FirmwareUpdateStatus> updates = new ConcurrentHashMap<>();

    public FirmwareService(@Value("${firmware.manifest-url:https://ssn.pp.ua/firmware/manifest.json}") String manifestUrl,
                           RestTemplateBuilder builder, ControllerRepository controllerRepository,
                           ControllerPublisher controllerPublisher, ControllerService controllerService,
                           ObjectMapper objectMapper) {
        this.manifestUrl = manifestUrl;
        this.restTemplate = builder.setConnectTimeout(Duration.ofSeconds(5)).setReadTimeout(Duration.ofSeconds(10)).build();
        this.controllerRepository = controllerRepository;
        this.controllerPublisher = controllerPublisher;
        this.controllerService = controllerService;
        this.objectMapper = objectMapper;
    }

    /**
     * Board id of the firmware build (platformio env): reported by firmware 2.4+, guessed from the platform before.
     */
    static String boardOf(String board, String platform) {
        if (board != null && !board.isBlank() && !"unknown".equals(board)) {
            return board;
        }
        return "esp8266".equalsIgnoreCase(platform) ? "esp8266" : "esp32dev";
    }

    /**
     * The build for the board in the current manifest, null when there is none (or no manifest).
     */
    JsonNode buildFor(String board) {
        JsonNode current = manifest();
        if (current == null) {
            return null;
        }
        for (JsonNode build : current.path("builds")) {
            if (board.equals(build.path("board").asText())) {
                return build;
            }
        }
        return null;
    }

    String latestVersion() {
        JsonNode current = manifest();
        return current == null ? null : current.path("version").asText(null);
    }

    /**
     * Adds the newer firmware for each board and the progress of a running update.
     */
    public List<Controller> decorate(List<Controller> controllers) {
        String latest = latestVersion();
        for (Controller controller : controllers) {
            String board = boardOf(controller.getBoard(), controller.getPlatform());
            if (latest != null && buildFor(board) != null && isNewer(latest, controller.getFirmwareVersion())) {
                controller.setAvailableFirmware(latest);
            }
            controller.setFirmwareUpdate(status(controller.getId(), controller.getFirmwareVersion()));
        }
        return controllers;
    }

    public FirmwareUpdateStatus requestUpdate(Long controllerId, Long userId) {
        ControllerEntity controller = controllerService.checkController(controllerId, userId);
        String board = boardOf(controller.getBoard(), controller.getPlatform());
        JsonNode build = buildFor(board);
        if (build == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No firmware published for " + board);
        }
        String version = latestVersion();
        String url = baseUrl() + build.path("file").asText();
        controllerPublisher.publishFirmwareUpdate(controller.getUserId(), controller.getHardwareId(),
                objectMapper.createObjectNode()
                        .put("url", url)
                        .put("md5", build.path("md5").asText())
                        .put("version", version)
                        .toString());
        FirmwareUpdateStatus status = new FirmwareUpdateStatus("REQUESTED", 0, version, null, LocalDateTime.now());
        updates.put(controllerId, status);
        log.info("Firmware {} requested for board {} ({})", version, controller.getHardwareId(), board);
        return status;
    }

    public void handleStatus(Long userId, String hardwareId, String payload) {
        ControllerEntity controller = controllerRepository.findByHardwareId(hardwareId).orElse(null);
        if (controller == null || !Objects.equals(controller.getUserId(), userId)) {
            log.warn("Update status from unknown board {} of user {}", hardwareId, userId);
            return;
        }
        try {
            JsonNode status = objectMapper.readTree(payload);
            FirmwareUpdateStatus update = new FirmwareUpdateStatus(
                    status.path("state").asText("unknown").toUpperCase(),
                    status.path("progress").asInt(0),
                    status.path("version").asText(null),
                    status.path("error").asText(null),
                    LocalDateTime.now());
            updates.put(controller.getId(), update);
            if ("FAILED".equals(update.state())) {
                log.warn("Firmware update of board {} failed: {}", hardwareId, update.error());
            }
        } catch (Exception e) {
            log.error("Cannot read update status of board {}: {}", hardwareId, payload, e);
        }
    }

    /**
     * Current update of the board, null when none runs: a finished one ends once the board reports the version.
     */
    FirmwareUpdateStatus status(Long controllerId, String runningVersion) {
        FirmwareUpdateStatus status = updates.get(controllerId);
        if (status == null) {
            return null;
        }
        if (status.version() != null && status.version().equals(runningVersion) && !"FAILED".equals(status.state())) {
            updates.remove(controllerId);
            return null;
        }
        boolean waiting = "REQUESTED".equals(status.state()) || "DOWNLOADING".equals(status.state())
                || "DONE".equals(status.state());
        if (waiting && status.updatedAt().plus(ANSWER_TIMEOUT).isBefore(LocalDateTime.now())) {
            return new FirmwareUpdateStatus("TIMEOUT", status.progress(), status.version(),
                    "The board stopped answering", status.updatedAt());
        }
        return status;
    }

    static boolean isNewer(String candidate, String current) {
        if (current == null || current.isBlank()) {
            return true;
        }
        String[] a = candidate.split("\\.");
        String[] b = current.split("\\.");
        for (int i = 0; i < Math.max(a.length, b.length); i++) {
            int x = i < a.length ? parse(a[i]) : 0;
            int y = i < b.length ? parse(b[i]) : 0;
            if (x != y) {
                return x > y;
            }
        }
        return false;
    }

    private static int parse(String part) {
        try {
            return Integer.parseInt(part.replaceAll("\\D.*", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String baseUrl() {
        return manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1);
    }

    private JsonNode manifest() {
        if (manifest != null && manifestLoadedAt.plus(MANIFEST_TTL).isAfter(Instant.now())) {
            return manifest;
        }
        try {
            manifest = restTemplate.getForObject(manifestUrl, JsonNode.class);
        } catch (Exception e) {
            log.warn("Cannot load the firmware manifest {}: {}", manifestUrl, e.getMessage());
        }
        // an unreachable manifest is not retried on every request
        manifestLoadedAt = Instant.now();
        return manifest;
    }

    // for tests
    void setManifest(JsonNode manifest) {
        this.manifest = manifest;
        this.manifestLoadedAt = Instant.now();
    }
}
