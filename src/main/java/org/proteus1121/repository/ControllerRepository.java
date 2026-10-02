package org.proteus1121.repository;

import org.proteus1121.model.entity.ControllerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ControllerRepository extends JpaRepository<ControllerEntity, Long> {

    List<ControllerEntity> findByUserIdOrderByIdAsc(Long userId);

    Optional<ControllerEntity> findByHardwareId(String hardwareId);
}
