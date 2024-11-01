package org.proteus1121.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.proteus1121.model.entity.UserEntity;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByName(String username);
}