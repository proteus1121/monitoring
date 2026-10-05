package org.proteus1121.service;

import org.springframework.web.server.ResponseStatusException;
import org.proteus1121.model.enums.BoardModel;
import org.proteus1121.model.enums.DisplayLanguage;
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
import org.proteus1121.model.dto.controller.CameraBoardRegistered;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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
    private ApplicationEventPublisher eventPublisher;
    private ControllerService controllerService;

    @BeforeEach
    void setUp() {
        controllerRepository = mock(ControllerRepository.class);
        deviceRepository = mock(DeviceRepository.class);
        userRepository = mock(UserRepository.class);
        controllerPublisher = mock(ControllerPublisher.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        controllerService = new ControllerService(controllerRepository, deviceRepository, userRepository,
                controllerPublisher, new ObjectMapper(), mock(ControllerShareRepository.class),
                mock(UserDeviceService.class), mock(MqttAccountService.class),
                eventPublisher);

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

        controllerService.handleHello(1L, "esp8266-abc", new ControllerHello("esp8266", "2.0.0", "10.0.0.2", "", true, null, null));

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
        controllerService.handleHello(1L, "esp32-1", new ControllerHello("esp32", "2.0.0", "10.0.0.3", version, true, null, null));

        verify(controllerPublisher, never()).publishConfiguration(any(), anyString(), any());
        assertEquals(version, controller.getAppliedConfigVersion());
    }

    @Test
    void configurationCarriesThePlatformDefaultDisplay() {
        when(controllerRepository.findByHardwareId("esp8266-abc")).thenReturn(Optional.empty());
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of());

        controllerService.handleHello(1L, "esp8266-abc", new ControllerHello("esp8266", "2.1.0", "10.0.0.2", "", true, null, null));

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
        controllerService.handleHello(99L, "esp32-x", new ControllerHello("esp32", "2.0.0", null, null, true, null, null));

        verify(controllerRepository, never()).save(any());
        verify(controllerPublisher, never()).publishConfiguration(any(), anyString(), any());
    }

    @Test
    void newCameraGetsItsBoardModelNoDisplayAndAFlameDevice() {
        when(controllerRepository.findByHardwareId("esp32-cam1")).thenReturn(Optional.empty());
        DeviceEntity camera = device(14L, DeviceType.FLAME, SensorModel.CAMERA, null);
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(camera));
        ArgumentCaptor<ControllerEntity> saved = ArgumentCaptor.forClass(ControllerEntity.class);

        controllerService.handleHello(1L, "esp32-cam1",
                new ControllerHello("esp32", "2.8.0", "10.0.0.4", "", null, "esp32cam", true));

        verify(controllerRepository).save(saved.capture());
        assertEquals(BoardModel.ESP32_CAM, saved.getValue().getBoardModel());
        assertEquals(Boolean.TRUE, saved.getValue().getCameraFound());
        verify(eventPublisher).publishEvent(new CameraBoardRegistered(5L, 1L));
        ArgumentCaptor<ControllerConfiguration> captor = ArgumentCaptor.forClass(ControllerConfiguration.class);
        verify(controllerPublisher).publishConfiguration(eq(1L), eq("esp32-cam1"), captor.capture());
        // the camera takes the pins of the default ESP32 display
        assertEquals(DisplayModel.NONE, captor.getValue().display().model());
        // the camera module has no pins and is sent anyway
        assertEquals(1, captor.getValue().devices().size());
        assertEquals(SensorModel.CAMERA, captor.getValue().devices().get(0).model());
    }

    @Test
    void knownCameraDoesNotGetAnotherFlameDevice() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp32-cam1");
        controller.setBoard("esp32cam");
        controller.setBoardModel(BoardModel.ESP32_CAM);
        when(controllerRepository.findByHardwareId("esp32-cam1")).thenReturn(Optional.of(controller));
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of());

        controllerService.handleHello(1L, "esp32-cam1",
                new ControllerHello("esp32", "2.8.0", "10.0.0.4", "", null, "esp32cam", true));

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void cameraBoardModelOnlyForTheCameraFirmware() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setPlatform("esp32");
        controller.setBoard("esp32dev");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));

        assertThrows(ResponseStatusException.class, () -> controllerService.setBoardModel(5L, 1L, BoardModel.ESP32_CAM));
        controller.setBoard("esp32cam");
        assertThrows(ResponseStatusException.class, () -> controllerService.setBoardModel(5L, 1L, BoardModel.ESP32_DEVKIT));
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

    @Test
    void boardModelDefaultsByPlatformAndCanBeChosen() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp8266-abc");
        controller.setPlatform("esp8266");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));

        assertEquals(BoardModel.NODEMCU, BoardModel.defaultFor("esp8266"));
        assertEquals(BoardModel.ESP32_DEVKIT, BoardModel.defaultFor("esp32"));
        Controller result = controllerService.setBoardModel(5L, 1L, BoardModel.D1_MINI);

        assertEquals(BoardModel.D1_MINI, controller.getBoardModel());
        assertEquals(BoardModel.D1_MINI, result.getBoardModel());
    }

    @Test
    void boardModelMustFitThePlatform() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setPlatform("esp8266");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));

        assertThrows(ResponseStatusException.class, () -> controllerService.setBoardModel(5L, 1L, BoardModel.ESP32_DEVKIT));
        assertThrows(ResponseStatusException.class, () -> controllerService.setBoardModel(5L, 2L, BoardModel.D1_MINI));
    }

    @Test
    void displayLanguageIsUkrainianUntilChosenAndGoesToTheBoard() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setHardwareId("esp8266-abc");
        controller.setPlatform("esp8266");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of());

        ControllerConfiguration before = controllerService.buildConfiguration(5L);
        assertEquals(DisplayLanguage.UK, before.display().lang());

        Controller result = controllerService.setDisplayLanguage(5L, 1L, DisplayLanguage.EN);

        assertEquals(DisplayLanguage.EN, result.getDisplayLanguage());
        ArgumentCaptor<ControllerConfiguration> captor = ArgumentCaptor.forClass(ControllerConfiguration.class);
        verify(controllerPublisher).publishConfiguration(eq(1L), eq("esp8266-abc"), captor.capture());
        assertEquals(DisplayLanguage.EN, captor.getValue().display().lang());
        // a new version, so the board applies it
        assertNotEquals(before.v(), captor.getValue().v());
        assertThrows(ResponseStatusException.class, () -> controllerService.setDisplayLanguage(5L, 2L, DisplayLanguage.UK));
    }

    @Test
    void soilCalibrationGoesToTheBoardOnlyForTheSoilProbe() {
        ControllerEntity controller = new ControllerEntity();
        controller.setId(5L);
        controller.setUserId(1L);
        controller.setPlatform("esp8266");
        when(controllerRepository.findById(5L)).thenReturn(Optional.of(controller));
        DeviceEntity soil = device(11L, DeviceType.SOIL_MOISTURE, SensorModel.SOIL_MOISTURE, 17);
        soil.setCalibrationDry(1024);
        soil.setCalibrationWet(420);
        DeviceEntity dht = device(12L, DeviceType.TEMPERATURE, SensorModel.DHT11, 16);
        dht.setCalibrationDry(1);
        when(deviceRepository.findByControllerId(5L)).thenReturn(List.of(soil, dht));

        List<ControllerConfiguration.Channel> channels = controllerService.buildConfiguration(5L).devices();

        assertEquals(1024, channels.get(0).dry());
        assertEquals(420, channels.get(0).wet());
        assertEquals(null, channels.get(1).dry());
        assertEquals(null, channels.get(1).wet());
    }
}
