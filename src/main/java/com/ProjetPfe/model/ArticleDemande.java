package com.ProjetPfe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "article_demande") // Tel que vous l'avez défini
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDemande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id", nullable = false)
    private Demande demande;

    @Column(nullable = false)
    private String nomArticle;

    @Lob
    private String description;

    @Column(nullable = false)
    private int quantite;

    @Column(nullable = true)
    private String unite;
}