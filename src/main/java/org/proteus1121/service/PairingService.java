package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Binds a board to an account without typing a user id on the board: an unpaired board asks for a code
 * over MQTT (pairing/{hardwareId}/request), shows it on its display and setup page, and the user enters it
 * on the site after signing in (password, Google or GitHub). The board then gets its user id on
 * pairing/{hardwareId}/result.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PairingService {

    static final Duration CODE_TTL = Duration.ofMinutes(15);
    // no 0/O, 1/I/L: the code is read from a small display
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;

    private final ControllerService controllerService;
    private final ControllerPublisher controllerPublisher;
    private final SecureRandom random = new SecureRandom();

    private record Pending(String hardwareId, String platform, String firmwareVersion, Instant expires) {
    }

    private final Map<String, Pending> byCode = new ConcurrentHashMap<>();
    private final Map<String, String> codeByBoard = new ConcurrentHashMap<>();

    /**
     * Gives the board a code, the same one while it is valid so the display does not change on every retry.
     */
    public void requestCode(String hardwareId, String platform, String firmwareVersion) {
        removeExpired();
        String code = codeByBoard.get(hardwareId);
        if (code == null || !byCode.containsKey(code)) {
            code = newCode();
            byCode.put(code, new Pending(hardwareId, platform, firmwareVersion, Instant.now().plus(CODE_TTL)));
            codeByBoard.put(hardwareId, code);
            log.info("Pairing code issued for board {}", hardwareId);
        }
        long expiresIn = Duration.between(Instant.now(), byCode.get(code).expires()).toSeconds();
        controllerPublisher.publishPairing(hardwareId, "code",
                "{\"code\":\"%s\",\"expiresIn\":%d}".formatted(code, expiresIn));
    }

    public Controller claim(Long userId, String rawCode) {
        removeExpired();
        String code = rawCode == null ? "" : rawCode.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        Pending pending = byCode.remove(code);
        if (pending == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown or expired code, check the board display");
        }
        codeByBoard.remove(pending.hardwareId());
        Controller controller = controllerService.claim(userId, pending.hardwareId(), pending.platform(),
                pending.firmwareVersion());
        controllerPublisher.publishPairing(pending.hardwareId(), "result", "{\"userId\":%d}".formatted(userId));
        return controller;
    }

    private String newCode() {
        String code;
        do {
            StringBuilder builder = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                builder.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
            }
            code = builder.toString();
        } while (byCode.containsKey(code));
        return code;
    }

    private void removeExpired() {
        Instant now = Instant.now();
        byCode.entrySet().removeIf(entry -> {
            boolean expired = entry.getValue().expires().isBefore(now);
            if (expired) {
                codeByBoard.remove(entry.getValue().hardwareId(), entry.getKey());
            }
            return expired;
        });
    }
}
