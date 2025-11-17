package org.proteus1121.repository;

import org.proteus1121.model.dto.device.Device;
import org.proteus1121.model.entity.IncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentRepository extends JpaRepository<IncidentEntity, Long> {

    List<IncidentEntity> findAllByDevices(List<Device> devices);

}