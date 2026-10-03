package org.proteus1121.service.llm;

import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Writes a description for devices created without one, in the background so creation stays fast.
 */
@Slf4j
@Service
public class DeviceDescriptionService {

    private final TextGenerationService textGeneration;
    private final SensorFactsFactory sensorFacts;
    private final DeviceRepository deviceRepository;
    private final DeviceMapper deviceMapper;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "device-description");
        thread.setDaemon(true);
        return thread;
    });

    public DeviceDescriptionService(TextGenerationService textGeneration, SensorFactsFactory sensorFacts,
                                    DeviceRepository deviceRepository, DeviceMapper deviceMapper) {
        this.textGeneration = textGeneration;
        this.sensorFacts = sensorFacts;
        this.deviceRepository = deviceRepository;
        this.deviceMapper = deviceMapper;
    }

    public Optional<String> describe(Device device) {
        return textGeneration.describeDevice(sensorFacts.of(device));
    }

    public void fillMissingAsync(Long deviceId) {
        if (!textGeneration.isEnabled()) {
            return;
        }
        executor.submit(() -> deviceRepository.findById(deviceId).ifPresent(entity -> {
            if (entity.getDescription() != null && !entity.getDescription().isBlank()) {
                return;
            }
            describe(deviceMapper.toDevice(entity)).ifPresent(text -> {
                // re-read: the user may have edited the device meanwhile
                deviceRepository.findById(deviceId).ifPresent(fresh -> {
                    if (fresh.getDescription() == null || fresh.getDescription().isBlank()) {
                        fresh.setDescription(text);
                        deviceRepository.save(fresh);
                        log.info("Generated description for device {}", deviceId);
                    }
                });
            });
        }));
    }
}
