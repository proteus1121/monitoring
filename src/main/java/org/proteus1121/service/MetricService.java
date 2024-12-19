package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.SensorDataEntity;
import org.proteus1121.model.mapper.SensorDataMapper;
import org.proteus1121.model.response.metric.SensorData;
import org.proteus1121.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MetricService {
    
    private final SensorDataRepository sensorDataRepository;
    private final DeviceService deviceService;
    private final SensorDataMapper sensorDataMapper;
    
    public List<SensorData> getMetrics(Long deviceId, LocalDateTime startTimestamp, LocalDateTime endTimestamp) {
        Device device = deviceService.checkDevice(deviceId);

        return sensorDataRepository.findByDeviceIdAndTimestampRange(device.getId(), startTimestamp, endTimestamp).stream()
                .map(sensorDataMapper::toSensorData)
                .toList();
    }
}
