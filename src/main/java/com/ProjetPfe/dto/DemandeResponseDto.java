// src/main/java/com/ProjetPfe/dto/DemandeResponseDto.java
package com.ProjetPfe.dto;

import com.ProjetPfe.model.Demande; // Importez votre entité Demande
import com.ProjetPfe.model.StatutDemande;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Collections; // Pour List.of() ou Collections.emptyList()
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemandeResponseDto {
    private Long id;
    private UserResponseDto utilisateur;
    private Date dateCreation;
    private StatutDemande statut;
    private String commentaire; // Le contenu du @Lob String de l'entité Demande
    private List<ArticleDemandeResponseDto> articlesDemandes;
    private List<FichierJointResponseDto> fichiersJoints;

    // Constructeur de mapping pour convertir une entité Demande en DemandeResponseDto
    public DemandeResponseDto(Demande demande) {
        this.id = demande.getId();

        if (demande.getUtilisateur() != null) {
            // Créez un UserResponseDto à partir de l'entité User
            // Assurez-vous que les getters existent dans votre entité User
            this.utilisateur = new UserResponseDto(
                    demande.getUtilisateur().getId(),
                    demande.getUtilisateur().getUsername(), // Ou un autre champ pour le nom d'affichage
                    demande.getUtilisateur().getEmail()
                    // Si vous voulez afficher le rôle :
                    // demande.getUtilisateur().getRole() != null ? demande.getUtilisateur().getRole().getName() : null
            );
        }

        this.dateCreation = demande.getDateCreation();
        this.statut = demande.getStatut();
        this.commentaire = demande.getCommentaire(); // Lecture du LOB String ici

        if (demande.getArticlesDemandes() != null) {
            this.articlesDemandes = demande.getArticlesDemandes().stream()
                    .map(article -> new ArticleDemandeResponseDto(
                            article.getId(),
                            article.getNomArticle(),
                            article.getDescription(), // Lecture du LOB String ici
                            article.getQuantite(),
                            article.getUnite()
                    ))
                    .collect(Collectors.toList());
        } else {
            this.articlesDemandes = Collections.emptyList();
        }

        if (demande.getFichiersJoints() != null) {
            this.fichiersJoints = demande.getFichiersJoints().stream()
                    .map(fichier -> {
                        // Le contenu binaire (fichier.getContenu()) n'est pas inclus dans FichierJointResponseDto
                        return new FichierJointResponseDto(
                                fichier.getId(),
                                fichier.getNomFichierOriginal(),
                                fichier.getType(),
                                fichier.getTaille()
                        );
                    })
                    .collect(Collectors.toList());
        } else {
            this.fichiersJoints = Collections.emptyList();
        }
    }
}