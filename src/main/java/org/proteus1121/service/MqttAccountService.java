package org.proteus1121.service;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.entity.MqttAccountEntity;
import org.proteus1121.repository.MqttAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Broker logins (MqttAccountEntity): one per linked board, so a board never holds an account password and can
 * be cut off by itself, plus the backend's own.
 */
@Slf4j
@Service
public class MqttAccountService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    // fits the 32 bytes the ESP8266 keeps for it
    static final int PASSWORD_LENGTH = 24;

    private final MqttAccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String serviceUsername;
    private final String servicePassword;
    private final SecureRandom random = new SecureRandom();

    public MqttAccountService(MqttAccountRepository repository, PasswordEncoder passwordEncoder,
                              @Value("${mqtt.broker.username:}") String serviceUsername,
                              @Value("${mqtt.broker.password:}") String servicePassword) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.serviceUsername = serviceUsername;
        this.servicePassword = servicePassword;
    }

    /**
     * New password for the board, replacing the previous one; returned in plain only here.
     */
    public String issue(String hardwareId, Long userId) {
        StringBuilder password = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            password.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        repository.save(new MqttAccountEntity(hardwareId, passwordEncoder.encode(password), userId, false));
        log.info("MQTT login issued for board {} of user {}", hardwareId, userId);
        return password.toString();
    }

    public void revoke(String hardwareId) {
        if (repository.existsById(hardwareId)) {
            repository.deleteById(hardwareId);
            log.info("MQTT login of board {} revoked", hardwareId);
        }
    }

    /**
     * The backend's login has to be in the table before its MQTT client connects (MqttConfig depends on this
     * bean), the broker checks it there.
     */
    @PostConstruct
    public void ensureServiceAccount() {
        if (serviceUsername.isBlank() || servicePassword.isBlank()) {
            return;
        }
        MqttAccountEntity account = repository.findById(serviceUsername).orElse(null);
        if (account != null && account.isSuperuser() && passwordEncoder.matches(servicePassword, account.getPasswordHash())) {
            return;
        }
        repository.save(new MqttAccountEntity(serviceUsername, passwordEncoder.encode(servicePassword), null, true));
        log.info("MQTT service login {} stored", serviceUsername);
    }
}
