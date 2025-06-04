package com.ProjetPfe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Date;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "demande")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Demande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private User utilisateur;

    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dateCreation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutDemande statut;

    // FIXED: Removed @Lob and used TEXT column definition instead
    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ArticleDemande> articlesDemandes = new ArrayList<>();

    @OneToMany(mappedBy = "demande", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<FichierJoint> fichiersJoints = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.dateCreation = new Date();
        if (this.statut == null) {
            this.statut = StatutDemande.EN_ATTENTE;
        }
    }

    // Méthodes utilitaires pour la cohérence bidirectionnelle
    public void addArticleDemande(ArticleDemande article) {
        articlesDemandes.add(article);
        article.setDemande(this);
    }

    public void removeArticleDemande(ArticleDemande article) {
        articlesDemandes.remove(article);
        article.setDemande(null);
    }

    public void addFichierJoint(FichierJoint fichier) {
        fichiersJoints.add(fichier);
        fichier.setDemande(this);
    }

    public void removeFichierJoint(FichierJoint fichier) {
        fichiersJoints.remove(fichier);
        fichier.setDemande(null);
    }
}