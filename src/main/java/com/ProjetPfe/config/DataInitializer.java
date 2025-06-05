package com.ProjetPfe.config;

import com.ProjetPfe.model.Role;
import com.ProjetPfe.model.User;
import com.ProjetPfe.repository.RoleRepository;
import com.ProjetPfe.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public DataInitializer(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // --- Création du rôle AGENT et de l'utilisateur agent ---
        Role agentRole = createRoleIfNotFound("ROLE_AGENT");
        createUserIfNotFound("agent.pfe@example.com", "agentPFE", "AgentNom", "AgentPrenom", agentRole);

        // --- NOUVEAU : Création du rôle SUCCURSALE et de l'utilisateur manager ---
        Role succursaleRole = createRoleIfNotFound("ROLE_SUCCURSALE");
        createUserIfNotFound("manager.pfe@example.com", "managerPFE", "ManagerNom", "ManagerPrenom", succursaleRole);
    }

    private Role createRoleIfNotFound(String roleName) {
        Optional<Role> roleOpt = roleRepository.findByNom(roleName);
        if (roleOpt.isEmpty()) {
            Role newRole = new Role();
            newRole.setNom(roleName);
            newRole = roleRepository.save(newRole);
            System.out.println("DataInitializer: Rôle '" + roleName + "' créé avec ID: " + newRole.getId());
            return newRole;
        } else {
            System.out.println("DataInitializer: Rôle '" + roleName + "' existant trouvé.");
            return roleOpt.get();
        }
    }

    private void createUserIfNotFound(String email, String username, String nom, String prenom, Role role) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("password123"); // Mot de passe en clair pour test
            newUser.setEmail(email);
            newUser.setNom(nom);
            newUser.setPrenom(prenom);
            newUser.setRole(role);

            userRepository.save(newUser);
            System.out.println("**************************************************************************************");
            System.out.println("DataInitializer: Utilisateur " + role.getNom() + " '" + email + "' CRÉÉ AVEC ID: " + newUser.getId());
            System.out.println("**************************************************************************************");
        } else {
            System.out.println("DataInitializer: Utilisateur '" + email + "' existe déjà.");
        }
    }
}