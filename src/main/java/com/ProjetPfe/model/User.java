package com.ProjetPfe.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode; // Import pour @EqualsAndHashCode.Exclude
import lombok.ToString; // Import pour @ToString.Exclude

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users") // Tel que vous l'avez défini
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", unique = true, nullable = false) // Tel que vous l'avez défini
    private String username;

    @Column(name = "password", nullable = false) // Tel que vous l'avez défini
    private String password;

    @Column(name = "email", unique = true, nullable = false) // Tel que vous l'avez défini
    private String email;

    @Column(name = "nom") // Tel que vous l'avez défini
    private String nom;

    @Column(name = "prenom") // Tel que vous l'avez défini
    private String prenom;

    @ManyToOne(fetch = FetchType.EAGER) // Relation avec l'entité Role
    @JoinColumn(name = "role_id") // Nom de la colonne clé étrangère dans la table 'users'
    private Role role; // Un utilisateur a un rôle

    @OneToMany(mappedBy = "utilisateur")
    @EqualsAndHashCode.Exclude // Pour éviter les boucles infinies avec Lombok
    @ToString.Exclude // Pour éviter les boucles infinies avec Lombok
    private List<Demande> demandes = new ArrayList<>();
}