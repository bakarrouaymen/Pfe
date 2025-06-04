// src/main/java/com/ProjetPfe/dto/ArticleDemandeResponseDto.java
package com.ProjetPfe.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor // Ce constructeur attendra id, nomArticle, description, quantite, unite
public class ArticleDemandeResponseDto {
    private Long id; // Le premier argument attendu par @AllArgsConstructor
    private String nomArticle;
    private String description;
    private int quantite;
    private String unite;

    public ArticleDemandeResponseDto(String pcPortable, String s, int i, String unité) {
    }

    public Object getDemande() {
        return null;
    }
}