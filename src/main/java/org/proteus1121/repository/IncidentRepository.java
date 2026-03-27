package org.proteus1121.repository;

import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.IncidentEntity;
import org.proteus1121.model.enums.Resolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<IncidentEntity, Long> {

    @Query("select distinct i from IncidentEntity i join i.devices d where d.id in :deviceIds")
    List<IncidentEntity> findAllByDevices(List<Long> deviceIds);

    @Query("SELECT i FROM IncidentEntity i JOIN i.devices d WHERE d.id = :deviceId AND i.status = :status ORDER BY i.created DESC LIMIT 1")
    Optional<IncidentEntity> findLatestUnresolvedByDeviceId(
            @Param("deviceId") Long deviceId,
            @Param("status") Resolution status
    );

    @Query("SELECT COUNT(i) FROM IncidentEntity i JOIN i.devices d WHERE d.id = :deviceId AND i.status != 'RESOLVED_MANUALLY' AND i.status != 'RESOLVED_AUTOMATICALLY'")
    long countUnresolvedIncidentsByDeviceId(@Param("deviceId") Long deviceId);
}