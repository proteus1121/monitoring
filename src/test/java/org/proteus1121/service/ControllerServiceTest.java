package org.proteus1121.service;

import org.proteus1121.repository.ControllerShareRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.proteus1121.model.dto.mqtt.ControllerConfiguration;
import org.proteus1121.model.dto.mqtt.ControllerHello;
import org.proteus1121.model.entity.ControllerEntity;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.mqtt.publisher.controller.ControllerPublisher;
import org.proteus1121.repository.ControllerRepository;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ControllerServiceTest {

    private ControllerRepository controllerRepository;
    private DeviceRepository deviceRepository;
    private UserRepository userRepository;
    private ControllerPublisher controllerPublisher;
    private ControllerService controllerService;

    @BeforeEach
    void setUp() {
        controllerRepository = mock(ControllerRepository.class);
        deviceRepository = mock(DeviceRepository.class);
        userRepository = mock(UserRepository.class);
        controllerPublisher = mock(ControllerPublisher.class);
        controllerService = new ControllerService(controllerRepository, deviceRepository, userRepository,
                controllerPublisher, new ObjectMapper(), mock(ControllerShareRepository.class),
                mock(UserDeviceService.class));

        when(userRepository.existsById(1L)).thenReturn(true);
        when(controllerRepository.save(any())).thenAnswer(invocation -> {
            ControllerEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) {
                entity.setId(5L);
            }
            return entity;
        });
    }

    @Test
    void newControllerIsRegisteredAndGetsConfiguration() {
        when(controllerRepository.findByHardwareId("esp8266-abc")).thenReturn(Optional.empty());
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(
                device(12L, DeviceType.HUMIDITY, SensorModel.DHT11, 16),
                device(11L, DeviceType.TEMPERATURE, SensorModel.DHT11, 16),
                device(13L, DeviceType.LIGHT, null, null)));

        controllerService.handleHello(1L, "esp8266-abc", new ControllerHello("esp8266", "2.0.0", "10.0.0.2", ""));

        ArgumentCaptor<ControllerConfiguration> captor = ArgumentCaptor.forClass(ControllerConfiguration.class);
        verify(controllerPublisher).publishConfiguration(eq(1L), eq("esp8266-abc"), captor.capture());
        ControllerConfiguration configuration = captor.getValue();
        assertNotNull(configuration.v());
        // device without module / pin is not sent, the rest is ordered by id
        assertEquals(2, configuration.devices().size());
        assertEquals(11L, configuration.devices().get(0).id());
        assertEquals(SensorModel.DHT11, configuration.devices().get(0).model());
        assertEquals(16, configuration.devices().get(0).pin());
    }

    @Test
    void configurationIsNotResentWhenBoardIsUpToDate() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp32-1");
        when(controllerRepository.findByHardwareId("esp32-1")).thenReturn(Optional.of(controller));
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(
                device(11L, DeviceType.RELAY, SensorModel.RELAY, 4)));

        String version = controllerService.buildConfiguration(5L).v();
        controllerService.handleHello(1L, "esp32-1", new ControllerHello("esp32", "2.0.0", "10.0.0.3", version));

        verify(controllerPublisher, never()).publishConfiguration(any(), anyString(), any());
        assertEquals(version, controller.getAppliedConfigVersion());
    }

    @Test
    void helloForUnknownUserIsIgnored() {
        controllerService.handleHello(99L, "esp32-x", new ControllerHello("esp32", "2.0.0", null, null));

        verify(controllerRepository, never()).save(any());
        verify(controllerPublisher, never()).publishConfiguration(any(), anyString(), any());
    }

    private DeviceEntity device(Long id, DeviceType type, SensorModel model, Integer pin) {
        DeviceEntity device = new DeviceEntity();
        device.setId(id);
        device.setType(type);
        device.setSensorModel(model);
        device.setPin(pin);
        device.setControllerId(5L);
        device.setDelay(5000L);
        return device;
    }
}
