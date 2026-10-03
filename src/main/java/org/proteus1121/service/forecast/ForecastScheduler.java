package org.proteus1121.service.forecast;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.enums.ForecastModel;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Refreshes forecasts every hour, one device at a time: the server is small and XGBoost uses
 * native memory, so running models in parallel is not worth it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastScheduler {

    private final DeviceRepository deviceRepository;
    private final ForecastService forecastService;

    @Scheduled(cron = "0 7 * * * *")
    public void refreshForecasts() {
        for (DeviceEntity device : deviceRepository.findAll()) {
            if (device.getForecastModel() == null || device.getForecastModel() == ForecastModel.NONE) {
                continue;
            }
            try {
                forecastService.run(device);
            } catch (Exception e) {
                log.error("Forecast for device {} failed", device.getId(), e);
            }
        }
    }
}
