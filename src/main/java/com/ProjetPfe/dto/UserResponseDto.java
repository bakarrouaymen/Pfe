// src/main/java/com/ProjetPfe/dto/UserResponseDto.java
package com.ProjetPfe.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private String email;
    // Ajoutez d'autres champs si nécessaire, mais pas le mot de passe !
}