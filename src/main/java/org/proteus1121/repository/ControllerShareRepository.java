package org.proteus1121.repository;

import org.proteus1121.model.entity.ControllerShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface ControllerShareRepository extends JpaRepository<ControllerShareEntity, Long> {

    List<ControllerShareEntity> findByControllerId(Long controllerId);

    List<ControllerShareEntity> findByUserId(Long userId);

    List<ControllerShareEntity> findByControllerIdIn(List<Long> controllerIds);

    Optional<ControllerShareEntity> findByControllerIdAndUserId(Long controllerId, Long userId);

    @Transactional
    void deleteByControllerId(Long controllerId);
}
