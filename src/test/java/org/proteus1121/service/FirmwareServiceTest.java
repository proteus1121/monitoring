package org.proteus1121.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FirmwareServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ControllerPublisher publisher;
    private FirmwareService service;
    private ControllerEntity board;

    @BeforeEach
    void setUp() throws Exception {
        publisher = mock(ControllerPublisher.class);
        ControllerRepository repository = mock(ControllerRepository.class);
        ControllerService controllerService = mock(ControllerService.class);
        service = new FirmwareService("https://ssn.pp.ua/firmware/manifest.json", new RestTemplateBuilder(),
                repository, publisher, controllerService, objectMapper);
        service.setManifest(objectMapper.readTree("""
                {"version":"2.4.0","builds":[
                  {"board":"esp8266","file":"monitoring-esp8266-2.4.0.bin","md5":"abc"},
                  {"board":"esp32dev","file":"monitoring-esp32dev-2.4.0.bin","md5":"def"}]}"""));

        board = new ControllerEntity();
        board.setId(5L);
        board.setUserId(1L);
        board.setHardwareId("esp8266-abc");
        board.setPlatform("esp8266");
        when(controllerService.checkController(5L, 1L)).thenReturn(board);
        when(repository.findByHardwareId("esp8266-abc")).thenReturn(Optional.of(board));
    }

    @Test
    void versionsCompareNumerically() {
        assertTrue(FirmwareService.isNewer("2.10.0", "2.9.3"));
        assertTrue(FirmwareService.isNewer("2.4.0", "2.3.0"));
        assertFalse(FirmwareService.isNewer("2.4.0", "2.4.0"));
        assertFalse(FirmwareService.isNewer("2.3.0", "2.4.0"));
        assertTrue(FirmwareService.isNewer("2.4.0", null));
    }

    @Test
    void boardWithoutReportedBuildIsGuessedFromThePlatform() {
        assertEquals("esp8266", FirmwareService.boardOf(null, "esp8266"));
        assertEquals("esp32dev", FirmwareService.boardOf(null, "esp32"));
        assertEquals("esp32cam", FirmwareService.boardOf("esp32cam", "esp32"));
    }

    @Test
    void newerFirmwareIsOffered() {
        Controller old = new Controller();
        old.setId(5L);
        old.setPlatform("esp8266");
        old.setFirmwareVersion("2.3.0");
        Controller current = new Controller();
        current.setId(6L);
        current.setBoard("esp32dev");
        current.setFirmwareVersion("2.4.0");

        service.decorate(List.of(old, current));

        assertEquals("2.4.0", old.getAvailableFirmware());
        assertNull(current.getAvailableFirmware());
    }

    @Test
    void updateSendsTheBoardItsFileAndTracksTheProgress() throws Exception {
        service.requestUpdate(5L, 1L);

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(publisher).publishFirmwareUpdate(eq(1L), eq("esp8266-abc"), payload.capture());
        var request = objectMapper.readTree(payload.getValue());
        assertEquals("https://ssn.pp.ua/firmware/monitoring-esp8266-2.4.0.bin", request.path("url").asText());
        assertEquals("abc", request.path("md5").asText());
        assertEquals("REQUESTED", service.status(5L, "2.3.0").state());

        service.handleStatus(1L, "esp8266-abc", "{\"state\":\"downloading\",\"progress\":40,\"version\":\"2.4.0\"}");
        assertEquals("DOWNLOADING", service.status(5L, "2.3.0").state());
        assertEquals(40, service.status(5L, "2.3.0").progress());

        service.handleStatus(1L, "esp8266-abc", "{\"state\":\"failed\",\"progress\":0,\"version\":\"2.4.0\",\"error\":\"image rejected\"}");
        assertEquals("image rejected", service.status(5L, "2.3.0").error());

        // finished once the board reports the new version
        service.handleStatus(1L, "esp8266-abc", "{\"state\":\"done\",\"progress\":100,\"version\":\"2.4.0\"}");
        assertNull(service.status(5L, "2.4.0"));
    }

    @Test
    void boardWithoutPublishedFirmwareCannotBeUpdated() {
        board.setBoard("esp32cam");
        assertThrows(ResponseStatusException.class, () -> service.requestUpdate(5L, 1L));
    }
}
