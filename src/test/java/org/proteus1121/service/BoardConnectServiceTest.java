package org.proteus1121.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.controller.BoardConnection;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.request.ConnectControllerRequest;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BoardConnectServiceTest {

    private ControllerService controllerService;
    private ControllerRepository controllerRepository;
    private MqttAccountService mqttAccountService;
    private BoardConnectService service;

    @BeforeEach
    void setUp() {
        controllerService = mock(ControllerService.class);
        controllerRepository = mock(ControllerRepository.class);
        mqttAccountService = mock(MqttAccountService.class);
        service = new BoardConnectService(controllerService, controllerRepository, mqttAccountService, "mqtt.example", 1883);
        when(controllerRepository.findByHardwareId(anyString())).thenReturn(Optional.empty());
        when(controllerService.claim(anyLong(), anyString(), any(), any())).thenReturn(new Controller());
        when(mqttAccountService.issue(anyString(), anyLong())).thenReturn("secret");
    }

    private static ConnectControllerRequest request(String back) {
        ConnectControllerRequest request = new ConnectControllerRequest();
        request.setHardwareId("esp8266-c62e98");
        request.setPlatform("esp8266");
        request.setFirmwareVersion("2.5.0");
        request.setBack(back);
        return request;
    }

    @Test
    void linksANewBoardAndGivesItALogin() {
        BoardConnection connection = service.connect(7L, request("http://192.168.1.150/connect"));

        verify(controllerService).claim(7L, "esp8266-c62e98", "esp8266", "2.5.0");
        verify(mqttAccountService).issue("esp8266-c62e98", 7L);
        assertEquals(7L, connection.userId());
        assertEquals("esp8266-c62e98", connection.mqttUsername());
        assertEquals("secret", connection.mqttPassword());
        assertEquals("mqtt.example", connection.mqttHost());
        assertEquals(1883, connection.mqttPort());
    }

    @Test
    void relinksOwnBoard() {
        ControllerEntity own = new ControllerEntity();
        own.setUserId(7L);
        when(controllerRepository.findByHardwareId("esp8266-c62e98")).thenReturn(Optional.of(own));

        service.connect(7L, request("http://192.168.1.150/connect"));

        verify(mqttAccountService).issue("esp8266-c62e98", 7L);
    }

    @Test
    void doesNotTakeABoardFromItsOwner() {
        ControllerEntity other = new ControllerEntity();
        other.setUserId(3L);
        when(controllerRepository.findByHardwareId("esp8266-c62e98")).thenReturn(Optional.of(other));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.connect(7L, request("http://192.168.1.150/connect")));

        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
        verify(controllerService, never()).claim(anyLong(), anyString(), any(), any());
        verify(mqttAccountService, never()).issue(anyString(), anyLong());
    }

    @Test
    void refusesALinkThatDoesNotLeadToABoard() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.connect(7L, request("https://evil.example/connect")));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verify(mqttAccountService, never()).issue(anyString(), anyLong());
    }

    @Test
    void acceptsOnlyTheBoardPageOnTheLocalNetwork() {
        assertTrue(BoardConnectService.isBoardAddress("http://192.168.1.150/connect"));
        assertTrue(BoardConnectService.isBoardAddress("http://10.0.0.7/connect"));
        assertTrue(BoardConnectService.isBoardAddress("http://172.20.1.2:8080/connect"));
        assertTrue(BoardConnectService.isBoardAddress("http://esp8266-c62e98.local/connect"));

        assertFalse(BoardConnectService.isBoardAddress("https://192.168.1.150/connect"));
        assertFalse(BoardConnectService.isBoardAddress("http://8.8.8.8/connect"));
        assertFalse(BoardConnectService.isBoardAddress("http://172.32.0.1/connect"));
        assertFalse(BoardConnectService.isBoardAddress("http://192.168.1.150/other"));
        assertFalse(BoardConnectService.isBoardAddress("http://192.168.1.150/connect?x=1"));
        assertFalse(BoardConnectService.isBoardAddress("http://user@192.168.1.150/connect"));
        assertFalse(BoardConnectService.isBoardAddress("http://evil.example/connect"));
        assertFalse(BoardConnectService.isBoardAddress("http://192.168.1.150.evil.example/connect"));
        assertFalse(BoardConnectService.isBoardAddress("javascript:alert(1)"));
        assertFalse(BoardConnectService.isBoardAddress(null));
    }
}
