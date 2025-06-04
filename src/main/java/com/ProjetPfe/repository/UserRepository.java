package com.ProjetPfe.repository;

import com.ProjetPfe.model.User; // Assurez-vous que le chemin d'importation est correct
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Assurez-vous que 'com.ProjetPfe.model.User' est correct
    Optional<User> findByEmail(String email);
}