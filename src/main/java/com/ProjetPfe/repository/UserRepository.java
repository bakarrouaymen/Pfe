package com.ProjetPfe.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<com.ProjetPfe.model.User, Long> {
    Optional<com.ProjetPfe.model.User> findByEmail(String email);
}
