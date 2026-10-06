package org.proteus1121.service;

import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.ForecastScore;
import org.proteus1121.model.entity.UserEntity;
import org.proteus1121.model.enums.DeviceRole;
import org.proteus1121.model.enums.DeviceType;
import org.proteus1121.model.enums.ForecastModel;
import org.proteus1121.repository.DeviceRepository;
import org.proteus1121.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Devices are loaded outside any session by the MQTT consumer: their forecast settings must come with them.
 * A fetch graph on the repository query made them lazy and every measurement failed before the status update.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:device-loading;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create",
        "spring.session.jdbc.initialize-schema=always",
        "mqtt.broker.url=tcp://localhost:1",
        "logging.level.root=WARN",
})
class DeviceLoadingTest {

    @Autowired
    private DeviceRepository deviceRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserDeviceService userDeviceService;
    @Autowired
    private DeviceService deviceService;

    @Test
    void forecastSettingsLoadOutsideASession() {
        UserEntity user = new UserEntity();
        user.setName("owner");
        user = userRepository.save(user);

        DeviceEntity entity = new DeviceEntity();
        entity.setName("DHT11 temperature");
        entity.setType(DeviceType.TEMPERATURE);
        entity.getForecastModels().addAll(Set.of(ForecastModel.XGBOOST, ForecastModel.KALMAN));
        entity.getForecastScores().put(ForecastModel.XGBOOST, new ForecastScore(0.5, 0.7, LocalDateTime.now()));
        entity = deviceRepository.save(entity);
        userDeviceService.shareDevice(entity.getId(), Map.of(user.getId(), DeviceRole.OWNER));

        Device device = deviceService.getDeviceById(entity.getId()).orElseThrow();
        assertEquals(Set.of(ForecastModel.XGBOOST, ForecastModel.KALMAN), device.getForecastModels());
        assertEquals(0.5, device.getForecastScores().get(ForecastModel.XGBOOST).getMae());

        List<Device> all = deviceService.getAllDevices(user.getId());
        assertEquals(1, all.size());
        assertEquals(2, all.get(0).getForecastModels().size());
    }
}
