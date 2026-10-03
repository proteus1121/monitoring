package org.proteus1121.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.controller.BoardScan;
import org.proteus1121.model.dto.controller.BoardScan.Finding;
import org.proteus1121.model.dto.controller.BoardScan.Kind;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.DisplayModel;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BoardScanServiceTest {

    private ControllerService controllerService;
    private ControllerRepository controllerRepository;
    private ControllerPublisher controllerPublisher;
    private BoardScanService service;

    @BeforeEach
    void setUp() {
        controllerService = mock(ControllerService.class);
        controllerRepository = mock(ControllerRepository.class);
        controllerPublisher = mock(ControllerPublisher.class);
        service = new BoardScanService(controllerService, controllerRepository, controllerPublisher, new ObjectMapper());

        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp8266-abc");
        when(controllerService.checkController(5L, 1L)).thenReturn(controller);
        when(controllerRepository.findByHardwareId("esp8266-abc")).thenReturn(Optional.of(controller));
    }

    @Test
    void scanIsRequestedAndPending() {
        assertNull(service.get(5L, 1L));

        BoardScan scan = service.request(5L, 1L);

        assertEquals(BoardScan.Status.PENDING, scan.status());
        verify(controllerPublisher).publishScanRequest(eq(1L), eq("esp8266-abc"), anyString());
        assertEquals(BoardScan.Status.PENDING, service.get(5L, 1L).status());
    }

    @Test
    void resultBecomesSuggestions() {
        service.request(5L, 1L);
        service.handleResult(1L, "esp8266-abc", """
                {"id":"x","pins":[2,4,5,12,13,14,15,17],"found":[
                 {"k":"dht","m":"DHT22","p":[13],"t":21.5,"h":40.2},
                 {"k":"bmp180","p":[4,14],"t":24.1,"pr":1012.6},
                 {"k":"i2c","p":[4,14],"a":60,"n":"oled"},
                 {"k":"i2c","p":[4,14],"a":35,"n":"bh1750"},
                 {"k":"digital","p":[5],"l":0},
                 {"k":"analog","p":[17],"v":512}]}""");

        BoardScan scan = service.get(5L, 1L);
        assertEquals(BoardScan.Status.DONE, scan.status());
        assertEquals(List.of(2, 4, 5, 12, 13, 14, 15, 17), scan.scannedPins());
        List<Finding> findings = scan.findings();
        assertEquals(6, findings.size());

        Finding dht = findings.get(0);
        assertEquals(Kind.SENSOR, dht.kind());
        assertEquals(21.5, dht.readings().get("TEMPERATURE"));
        var devices = dht.options().get(0).devices();
        assertEquals(2, devices.size());
        assertEquals(SensorModel.DHT22, devices.get(0).sensorModel());
        assertEquals(DeviceType.TEMPERATURE, devices.get(0).type());
        assertEquals(13, devices.get(0).pin());
        assertNull(devices.get(0).secondaryPin());

        var bmp = findings.get(1).options().get(0).devices();
        assertEquals(List.of(DeviceType.TEMPERATURE, DeviceType.PRESSURE), bmp.stream().map(d -> d.type()).toList());
        assertEquals(14, bmp.get(0).secondaryPin());

        assertEquals(Kind.DISPLAY, findings.get(2).kind());
        assertEquals(DisplayModel.SSD1306, findings.get(2).display().model());
        assertEquals(List.of(4, 14), findings.get(2).display().pins());

        assertEquals(Kind.UNSUPPORTED, findings.get(3).kind());

        Finding digital = findings.get(4);
        assertEquals(Kind.CHOOSE, digital.kind());
        assertEquals(0.0, digital.readings().get("LEVEL"));
        assertEquals(4, digital.options().size());
        assertEquals("Flame sensor", digital.options().get(0).devices().get(0).name());

        Finding analog = findings.get(5);
        assertEquals(SensorModel.MQ2, analog.options().get(0).model());
        // MQ-2 gives three measurements, a plain analog input one
        assertEquals(3, analog.options().get(0).devices().size());
        assertEquals(1, analog.options().get(1).devices().size());
    }

    @Test
    void resultOfAnotherUsersBoardIsIgnored() {
        service.request(5L, 1L);
        service.handleResult(2L, "esp8266-abc", "{\"found\":[]}");

        assertEquals(BoardScan.Status.PENDING, service.get(5L, 1L).status());
    }
}
