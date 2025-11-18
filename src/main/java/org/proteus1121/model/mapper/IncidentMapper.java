package org.proteus1121.model.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.proteus1121.model.dto.incident.Incident;
import org.proteus1121.model.entity.IncidentEntity;

@Mapper(componentModel = "spring", uses = { UserMapper.class, DeviceMapper.class })
public interface IncidentMapper {

    @Mapping(target = "devices", source = "devices", qualifiedByName = "toPlainDevice")
    Incident toIncident(IncidentEntity incidentEntity);
    
}
