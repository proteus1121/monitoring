package org.proteus1121.service;

import org.proteus1121.model.entity.IncidentImageEntity;
import org.proteus1121.repository.IncidentImageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashSet;
import java.util.Set;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.dto.incident.Incident;
import org.proteus1121.model.entity.DeviceEntity;
import org.proteus1121.model.entity.IncidentEntity;
import org.proteus1121.model.entity.UserDeviceEntity;
import org.proteus1121.model.entity.UserDeviceId;
import org.proteus1121.model.enums.Resolution;
import org.proteus1121.model.enums.Severity;
import org.proteus1121.model.mapper.DeviceMapper;
import org.proteus1121.model.mapper.IncidentMapper;
import org.proteus1121.repository.IncidentRepository;
import org.springframework.data.domain.PageRequest;
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
    private final IncidentImageRepository incidentImageRepository;

    public List<Incident> getAllIncidents(Long userId) {
        List<Long> allDevices = deviceService.getAllDevices(userId).stream()
                .map(Device::getId)
                .toList();
        List<IncidentEntity> incidents = incidentRepository.findAllByDevices(allDevices);
        return withImages(incidents.stream()
                .map(incidentMapper::toIncident)
                .toList());
    }

    /**
     * Marks the incidents that have a picture.
     */
    private List<Incident> withImages(List<Incident> incidents) {
        if (incidents.isEmpty()) {
            return incidents;
        }
        Set<Long> withImage = new HashSet<>(incidentImageRepository.findIdsWithImage(
                incidents.stream().map(Incident::getId).toList()));
        incidents.forEach(incident -> incident.setImage(withImage.contains(incident.getId())));
        return incidents;
    }

    public void saveImage(Long incidentId, byte[] jpeg) {
        incidentImageRepository.save(new IncidentImageEntity(incidentId, jpeg));
    }

    /**
     * The picture of an incident of the user's devices, empty when it has none.
     */
    public Optional<byte[]> getImage(Long id, Long userId) {
        IncidentEntity incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident " + id + " not found"));
        if (!isDeviceBelongToUser(userId, incident)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident " + id + " not found");
        }
        return incidentImageRepository.findById(id).map(IncidentImageEntity::getJpeg);
    }

    /**
     * Statuses that still need attention.
     */
    public static final List<Resolution> OPEN_STATUSES = List.of(Resolution.UNRESOLVED, Resolution.ACKNOWLEDGED);

    /**
     * Newest first; only open ones when {@code openOnly}.
     */
    public List<Incident> getIncidents(Long userId, boolean openOnly, int limit) {
        List<Long> deviceIds = deviceIds(userId);
        if (deviceIds.isEmpty()) {
            return List.of();
        }
        List<Resolution> statuses = openOnly ? OPEN_STATUSES : List.of(Resolution.values());
        return withImages(incidentRepository.findByDevicesAndStatuses(deviceIds, statuses, PageRequest.of(0, limit)).stream()
                .map(incidentMapper::toIncident)
                .toList());
    }

    public long countOpenIncidents(Long userId) {
        List<Long> deviceIds = deviceIds(userId);
        return deviceIds.isEmpty() ? 0 : incidentRepository.findIdsByDevicesAndStatuses(deviceIds, OPEN_STATUSES).size();
    }

    @Transactional
    public int resolveAllIncidents(Long userId) {
        List<Long> deviceIds = deviceIds(userId);
        if (deviceIds.isEmpty()) {
            return 0;
        }
        List<Long> ids = incidentRepository.findIdsByDevicesAndStatuses(deviceIds, OPEN_STATUSES);
        return ids.isEmpty() ? 0 : incidentRepository.updateStatus(ids, Resolution.RESOLVED_MANUALLY);
    }

    private List<Long> deviceIds(Long userId) {
        return deviceService.getAllDevices(userId).stream()
                .map(Device::getId)
                .toList();
    }

    public Optional<Incident> getIncident(Long id, Long userId) {
        return incidentRepository.findById(id).map(incidentEntity -> {
            boolean isDeviceBelongToUser = isDeviceBelongToUser(userId, incidentEntity);

            if (!isDeviceBelongToUser) {
                throw new IllegalArgumentException("User does not have permission to resolve this incident.");
            }
            
            Incident incident = incidentMapper.toIncident(incidentEntity);
            incident.setImage(incidentImageRepository.existsById(id));
            return incident;
        });
    }

    public void resolveIncident(Long id, Long userId) {
        incidentRepository.findById(id).ifPresent(incidentEntity -> {
            boolean isDeviceBelongToUser = isDeviceBelongToUser(userId, incidentEntity);
            
            if (!isDeviceBelongToUser) {
                throw new IllegalArgumentException("User does not have permission to resolve this incident.");
            }

            incidentEntity.setStatus(Resolution.RESOLVED_MANUALLY);
            incidentRepository.save(incidentEntity);
        });
    }

    private boolean isDeviceBelongToUser(Long userId, IncidentEntity incidentEntity) {
        return incidentEntity.getDevices().stream()
                .flatMap(d -> d.getUserDevices().stream())
                .map(UserDeviceEntity::getUserId)
                .anyMatch(deviceUserId -> Objects.equals(deviceUserId, userId));
    }

    public IncidentEntity createIncident(String message, Severity severity, List<Device> devices) {
        List<DeviceEntity> deviceEntities = devices.stream()
                .map(device -> deviceMapper.toDeviceEntity(device.getId(), device))
                .toList();
        IncidentEntity incidentEntity = new IncidentEntity(message, severity, deviceEntities);
        return incidentRepository.save(incidentEntity);
    }

    public void setDescription(Long incidentId, String description) {
        incidentRepository.findById(incidentId).ifPresent(incident -> {
            incident.setDescription(description);
            incidentRepository.save(incident);
        });
    }

    /**
     * Check if there is an unresolved incident for a device
     * @return true if an unresolved incident exists, false otherwise
     */
    public boolean hasUnresolvedIncident(Long deviceId) {
        long unresolvedCount = incidentRepository.countUnresolvedIncidentsByDeviceId(deviceId);
        return unresolvedCount > 0;
    }

    /**
     * Get the latest unresolved incident for a device
     * @return Optional containing the latest unresolved incident if it exists
     */
    public Optional<IncidentEntity> getLatestUnresolvedIncident(Long deviceId) {
        return incidentRepository.findLatestUnresolvedByDeviceId(deviceId, Resolution.UNRESOLVED);
    }
}
