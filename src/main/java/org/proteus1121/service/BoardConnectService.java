package org.proteus1121.service;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.controller.BoardConnection;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.request.ConnectControllerRequest;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Links a board to the user who signed in from its page: the board's setup page sends the browser to the site
 * with the board's id and its own address, the site calls this and sends the browser back to the board with
 * the board's new MQTT login.
 */
@Slf4j
@Service
public class BoardConnectService {

    private static final Pattern HARDWARE_ID = Pattern.compile("(esp8266|esp32)-[0-9a-f]{1,12}");
    private static final Pattern LOCAL_HOST = Pattern.compile("[a-z0-9-]{1,63}\\.local");

    private final ControllerService controllerService;
    private final ControllerRepository controllerRepository;
    private final MqttAccountService mqttAccountService;
    private final String brokerHost;
    private final int brokerPort;

    public BoardConnectService(ControllerService controllerService, ControllerRepository controllerRepository,
                               MqttAccountService mqttAccountService,
                               @Value("${mqtt.public-host:139.59.148.159}") String brokerHost,
                               @Value("${mqtt.public-port:1883}") int brokerPort) {
        this.controllerService = controllerService;
        this.controllerRepository = controllerRepository;
        this.mqttAccountService = mqttAccountService;
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    public BoardConnection connect(Long userId, ConnectControllerRequest request) {
        String hardwareId = request.getHardwareId();
        if (!HARDWARE_ID.matcher(hardwareId).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown board id " + hardwareId);
        }
        if (!isBoardAddress(request.getBack())) {
            // the password goes to this address: only the board's own page on the local network
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The link does not lead back to a board");
        }
        controllerRepository.findByHardwareId(hardwareId)
                .filter(controller -> controller.getUserId() != null && !Objects.equals(controller.getUserId(), userId))
                .ifPresent(controller -> {
                    // nothing proves the user is at the board, so a board is not taken from its owner
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "This board belongs to another account. Its owner has to remove it on the site first.");
                });
        Controller controller = controllerService.claim(userId, hardwareId, request.getPlatform(),
                request.getFirmwareVersion());
        String password = mqttAccountService.issue(hardwareId, userId);
        return new BoardConnection(controller, userId, hardwareId, password, brokerHost, brokerPort);
    }

    /**
     * http://{private IPv4 or name.local}[:port]/connect, the page the board serves.
     */
    static boolean isBoardAddress(String back) {
        if (back == null) {
            return false;
        }
        URI uri;
        try {
            uri = new URI(back);
        } catch (Exception e) {
            return false;
        }
        if (!"http".equals(uri.getScheme()) || !"/connect".equals(uri.getPath()) || uri.getRawQuery() != null
                || uri.getRawFragment() != null || uri.getRawUserInfo() != null || uri.getHost() == null) {
            return false;
        }
        String host = uri.getHost().toLowerCase();
        return isPrivateIpv4(host) || LOCAL_HOST.matcher(host).matches();
    }

    private static boolean isPrivateIpv4(String host) {
        String[] parts = host.split("\\.");
        if (parts.length != 4) {
            return false;
        }
        int[] octets = new int[4];
        for (int i = 0; i < 4; i++) {
            if (!parts[i].matches("\\d{1,3}")) {
                return false;
            }
            octets[i] = Integer.parseInt(parts[i]);
            if (octets[i] > 255) {
                return false;
            }
        }
        return octets[0] == 10
                || (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31)
                || (octets[0] == 192 && octets[1] == 168);
    }
}
