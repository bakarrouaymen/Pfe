// src/main/java/com/ProjetPfe/dto/FichierJointResponseDto.java
package com.ProjetPfe.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FichierJointResponseDto {
    private Long id;
    private String nomFichierOriginal;
    private String type;
    private Long taille;
    // Note : Nous ne renvoyons PAS le contenu du fichier (byte[]) dans la liste des demandes
    // pour ne pas alourdir la réponse. Le contenu sera récupéré via l'endpoint de téléchargement.
}