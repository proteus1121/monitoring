package org.proteus1121.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.proteus1121.model.entity.MqttAccountEntity;
import org.proteus1121.repository.MqttAccountRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MqttAccountServiceTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private MqttAccountRepository repository;
    private MqttAccountService service;

    @BeforeEach
    void setUp() {
        repository = mock(MqttAccountRepository.class);
        service = new MqttAccountService(repository, encoder, "backend", "service-pass");
    }

    @Test
    void issuesARandomPasswordAndKeepsOnlyItsHash() {
        String first = service.issue("esp8266-c62e98", 7L);
        String second = service.issue("esp8266-c62e98", 7L);

        ArgumentCaptor<MqttAccountEntity> saved = ArgumentCaptor.forClass(MqttAccountEntity.class);
        verify(repository, times(2)).save(saved.capture());
        MqttAccountEntity account = saved.getAllValues().get(1);
        assertEquals(MqttAccountService.PASSWORD_LENGTH, second.length());
        assertNotEquals(first, second);
        assertEquals("esp8266-c62e98", account.getUsername());
        assertEquals(7L, account.getUserId());
        assertFalse(account.isSuperuser());
        assertNotEquals(second, account.getPasswordHash());
        // the broker checks it as bcrypt
        assertTrue(account.getPasswordHash().startsWith("$2a$"));
        assertTrue(encoder.matches(second, account.getPasswordHash()));
    }

    @Test
    void storesTheServiceLoginAsSuperuser() {
        when(repository.findById("backend")).thenReturn(Optional.empty());

        service.ensureServiceAccount();

        ArgumentCaptor<MqttAccountEntity> saved = ArgumentCaptor.forClass(MqttAccountEntity.class);
        verify(repository).save(saved.capture());
        assertTrue(saved.getValue().isSuperuser());
        assertTrue(encoder.matches("service-pass", saved.getValue().getPasswordHash()));
    }

    @Test
    void keepsAnUpToDateServiceLogin() {
        when(repository.findById("backend")).thenReturn(Optional.of(
                new MqttAccountEntity("backend", encoder.encode("service-pass"), null, true)));

        service.ensureServiceAccount();

        verify(repository, never()).save(any());
    }

    @Test
    void revokesABoard() {
        when(repository.existsById("esp8266-c62e98")).thenReturn(true);

        service.revoke("esp8266-c62e98");

        verify(repository).deleteById("esp8266-c62e98");
    }
}
