package org.proteus1121.service;

import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.incident.Incident;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.IncidentEntity;
import org.proteus1121.model.enums.Resolution;
import org.proteus1121.model.enums.Severity;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.mapper.IncidentMapper;
import org.proteus1121.repository.IncidentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final DeviceService deviceService;
    private final IncidentMapper incidentMapper;
    private final DeviceMapper deviceMapper;

    public List<Incident> getAllIncidents(Long userId) {
        List<Long> allDevices = deviceService.getAllDevices(userId).stream()
                .map(Device::getId)
                .toList();
        List<IncidentEntity> incidents = incidentRepository.findAllByDevices(allDevices);
        return incidents.stream()
                .map(incidentMapper::toIncident)
                .toList();
    }

    public Optional<Incident> getIncident(Long id, Long userId) {
        return incidentRepository.findById(id).map(incidentEntity -> {
            boolean isDeviceBelongToUser = incidentEntity.getDevices().stream()
                    .anyMatch(deviceEntity -> Objects.equals(deviceEntity.getUser().getId(), userId));

            if (!isDeviceBelongToUser) {
                throw new IllegalArgumentException("User does not have permission to resolve this incident.");
            }
            
            return incidentMapper.toIncident(incidentEntity);
        });
    }

    public void resolveIncident(Long id, Long userId) {
        incidentRepository.findById(id).ifPresent(incidentEntity -> {
            boolean isDeviceBelongToUser = incidentEntity.getDevices().stream()
                    .anyMatch(deviceEntity -> Objects.equals(deviceEntity.getUser().getId(), userId));
            
            if (!isDeviceBelongToUser) {
                throw new IllegalArgumentException("User does not have permission to resolve this incident.");
            }

            incidentEntity.setStatus(Resolution.RESOLVED_MANUALLY);
            incidentRepository.save(incidentEntity);
        });
    }
    
    public void createIncident(String message, Severity severity, List<Device> devices) {
        List<DeviceEntity> deviceEntities = devices.stream()
                .map(device -> deviceMapper.toDeviceEntity(device.getId(), device))
                .toList();
        IncidentEntity incidentEntity = new IncidentEntity(message, severity, deviceEntities);
        incidentRepository.save(incidentEntity);
    }
}
