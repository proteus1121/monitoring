package org.proteus1121.repository;

import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.IncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IncidentRepository extends JpaRepository<IncidentEntity, Long> {

    @Query("select distinct i from IncidentEntity i join i.devices d where d.id in :deviceIds")
    List<IncidentEntity> findAllByDevices(List<Long> deviceIds);

}