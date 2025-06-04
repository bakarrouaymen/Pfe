package com.ProjetPfe.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fichier_joint")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FichierJoint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom_fichier_original", nullable = false)
    private String nomFichierOriginal;

    @Column(name = "type")
    private String type; // Type MIME du fichier

    @Column(name = "taille")
    private Long taille; // Taille en octets

    // CORRECTION : Suppression de @Lob et columnDefinition
    @Column(name = "contenu")
    private byte[] contenu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_id", nullable = false)
    private Demande demande;
}