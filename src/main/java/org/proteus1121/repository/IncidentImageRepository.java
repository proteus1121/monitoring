package org.proteus1121.repository;

import org.proteus1121.model.entity.IncidentImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface IncidentImageRepository extends JpaRepository<IncidentImageEntity, Long> {

    /**
     * Which of the incidents have a picture, without loading the pictures.
     */
    @Query("select i.incidentId from IncidentImageEntity i where i.incidentId in :ids")
    List<Long> findIdsWithImage(@Param("ids") Collection<Long> ids);
}
