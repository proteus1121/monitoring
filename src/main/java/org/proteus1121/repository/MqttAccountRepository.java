package org.proteus1121.repository;

import org.proteus1121.model.entity.MqttAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MqttAccountRepository extends JpaRepository<MqttAccountEntity, String> {
}
