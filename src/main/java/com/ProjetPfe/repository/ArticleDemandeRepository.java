package com.ProjetPfe.repository;

import com.ProjetPfe.model.ArticleDemande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleDemandeRepository extends JpaRepository<ArticleDemande, Long> {
// Généralement moins de méthodes personnalisées ici si les articles
}