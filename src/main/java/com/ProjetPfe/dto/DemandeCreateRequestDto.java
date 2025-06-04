package com.ProjetPfe.dto;
import lombok.Data;
// ... autres imports
import java.util.List;

@Data
public class DemandeCreateRequestDto {
    private Long utilisateurId;
    private String commentaire;
    private List<ArticleDemandeDto> articles; // <<< Doit être ArticleDemandeDto
}