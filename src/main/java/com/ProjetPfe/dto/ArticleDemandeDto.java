package com.ProjetPfe.dto;
import lombok.Data;

@Data
public class ArticleDemandeDto {
    private String nomArticle;
    private String description;
    private int quantite;
    private String unite;
}