package com.ProjetPfe.repository;

import com.ProjetPfe.model.Demande;
import com.ProjetPfe.model.User; // Importer User si vous utilisez findByUtilisateur(User utilisateur)
import com.ProjetPfe.model.StatutDemande; // Importer StatutDemande si vous ajoutez des filtres par statut
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemandeRepository extends JpaRepository<Demande, Long> {

    List<Demande> findByUtilisateurId(Long utilisateurId);

    List<Demande> findByUtilisateur(User utilisateur);
    List<Demande> findByStatut(StatutDemande statut);
    List<Demande> findByUtilisateurIdAndStatut(Long utilisateurId, StatutDemande statut);
}