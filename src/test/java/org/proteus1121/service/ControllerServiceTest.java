package org.proteus1121.service;

import org.springframework.web.server.ResponseStatusException;
import org.proteus1121.model.enums.DisplayModel;
import org.proteus1121.model.dto.controller.DisplaySettings;
import org.proteus1121.model.dto.controller.Controller;
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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

        controllerService.handleHello(1L, "esp8266-abc", new ControllerHello("esp8266", "2.0.0", "10.0.0.2", "", true));

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
        controllerService.handleHello(1L, "esp32-1", new ControllerHello("esp32", "2.0.0", "10.0.0.3", version, true));

        verify(controllerPublisher, never()).publishConfiguration(any(), anyString(), any());
        assertEquals(version, controller.getAppliedConfigVersion());
    }

    @Test
    void configurationCarriesThePlatformDefaultDisplay() {
        when(controllerRepository.findByHardwareId("esp8266-abc")).thenReturn(Optional.empty());
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of());

        controllerService.handleHello(1L, "esp8266-abc", new ControllerHello("esp8266", "2.1.0", "10.0.0.2", "", true));

        ArgumentCaptor<ControllerConfiguration> captor = ArgumentCaptor.forClass(ControllerConfiguration.class);
        verify(controllerPublisher).publishConfiguration(eq(1L), eq("esp8266-abc"), captor.capture());
        assertEquals(DisplayModel.ST7565, captor.getValue().display().model());
        assertEquals(List.of(14, 12, 4, 13, 2), captor.getValue().display().pins());
    }

    @Test
    void displayIsSavedAndPublished() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp8266-abc");
        controller.setPlatform("esp8266");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(
                device(11L, DeviceType.TEMPERATURE, SensorModel.DHT11, 16)));

        Controller result = controllerService.updateDisplay(5L, 1L, DisplayModel.SSD1306, List.of(4, 14), false);

        assertEquals(DisplayModel.SSD1306, controller.getDisplayModel());
        assertEquals("4,14", controller.getDisplayPins());
        assertEquals(new DisplaySettings(DisplayModel.SSD1306, List.of(4, 14), false), result.getDisplay());
        ArgumentCaptor<ControllerConfiguration> captor = ArgumentCaptor.forClass(ControllerConfiguration.class);
        verify(controllerPublisher).publishConfiguration(eq(1L), eq("esp8266-abc"), captor.capture());
        assertEquals(List.of(4, 14), captor.getValue().display().pins());
    }

    @Test
    void displayCannotTakeAPinOfADevice() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(
                device(11L, DeviceType.FLAME, SensorModel.FLAME_IR, 5)));

        assertThrows(ResponseStatusException.class,
                () -> controllerService.updateDisplay(5L, 1L, DisplayModel.SSD1306, List.of(4, 5), false));
        verify(controllerRepository, never()).save(any());
    }

    @Test
    void bmp180MayShareTheDisplayI2cBus() {
        DisplaySettings display = new DisplaySettings(DisplayModel.SSD1306, List.of(27, 14), false);

        assertDoesNotThrow(() -> controllerService.checkDisplayConflict(display, SensorModel.BMP180, 27, 14, "Barometer"));
        assertThrows(ResponseStatusException.class,
                () -> controllerService.checkDisplayConflict(display, SensorModel.DHT11, 27, null, "Thermometer"));
    }

    @Test
    void helloForUnknownUserIsIgnored() {
        controllerService.handleHello(99L, "esp32-x", new ControllerHello("esp32", "2.0.0", null, null, true));

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
