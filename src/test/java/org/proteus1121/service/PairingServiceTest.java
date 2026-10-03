package org.proteus1121.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PairingServiceTest {

    private ControllerService controllerService;
    private ControllerPublisher publisher;
    private PairingService pairingService;

    @BeforeEach
    void setUp() {
        controllerService = mock(ControllerService.class);
        publisher = mock(ControllerPublisher.class);
        pairingService = new PairingService(controllerService, publisher);
    }

    private String issuedCode(String hardwareId) {
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(publisher, org.mockito.Mockito.atLeastOnce()).publishPairing(eq(hardwareId), eq("code"), payload.capture());
        String json = payload.getValue();
        return json.substring(json.indexOf("\"code\":\"") + 8, json.indexOf("\"code\":\"") + 14);
    }

    @Test
    void boardKeepsItsCodeWhileValid() {
        pairingService.requestCode("esp8266-1", "esp8266", "2.1.0");
        String first = issuedCode("esp8266-1");
        pairingService.requestCode("esp8266-1", "esp8266", "2.1.0");

        verify(publisher, times(2)).publishPairing(eq("esp8266-1"), eq("code"), anyString());
        assertEquals(first, issuedCode("esp8266-1"));
        assertTrue(first.matches("[A-Z2-9]{6}"));
    }

    @Test
    void claimBindsBoardAndTellsItTheUser() {
        when(controllerService.claim(7L, "esp32-a", "esp32", "2.1.0")).thenReturn(new Controller());
        pairingService.requestCode("esp32-a", "esp32", "2.1.0");
        String code = issuedCode("esp32-a");

        // typed in lower case with a separator
        pairingService.claim(7L, code.substring(0, 3).toLowerCase() + "-" + code.substring(3));

        verify(controllerService).claim(7L, "esp32-a", "esp32", "2.1.0");
        verify(publisher).publishPairing("esp32-a", "result", "{\"userId\":7}");
        // a code works once
        assertThrows(ResponseStatusException.class, () -> pairingService.claim(8L, code));
    }

    @Test
    void unknownCodeIsRejected() {
        assertThrows(ResponseStatusException.class, () -> pairingService.claim(1L, "ZZZZZZ"));
    }
}
