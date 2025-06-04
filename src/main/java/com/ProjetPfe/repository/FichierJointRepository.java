package com.ProjetPfe.repository;

import com.ProjetPfe.model.FichierJoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FichierJointRepository extends JpaRepository<FichierJoint, Long> {
    // Méthodes personnalisées si nécessaire
}