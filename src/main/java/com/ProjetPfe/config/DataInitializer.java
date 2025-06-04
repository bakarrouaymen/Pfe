package com.ProjetPfe.config;

import com.ProjetPfe.model.Role;
import com.ProjetPfe.model.User;
import com.ProjetPfe.repository.RoleRepository;
import com.ProjetPfe.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
// import org.springframework.security.crypto.password.PasswordEncoder; // Pour l'encodage futur

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    // private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository
            /*, PasswordEncoder passwordEncoder */) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        // this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Créer le rôle AGENT s'il n'existe pas
        String roleAgentName = "ROLE_AGENT"; // Ou le nom que vous préférez pour le rôle agent
        // Assurez-vous que votre RoleRepository findByName et que votre entité Role utilise 'name'
        Optional<Role> agentRoleOpt = roleRepository.findByNom(roleAgentName);
        Role agentRole;

        if (agentRoleOpt.isEmpty()) {
            agentRole = new Role();
            agentRole.setNom(roleAgentName); // Correspond à @Column(name="name") private String name; dans Role.java
            agentRole = roleRepository.save(agentRole);
            System.out.println("DataInitializer: Rôle '" + roleAgentName + "' créé avec ID: " + agentRole.getId());
        } else {
            agentRole = agentRoleOpt.get();
            System.out.println("DataInitializer: Rôle '" + roleAgentName + "' existant trouvé avec ID: " + agentRole.getId());
        }

        // 2. Créer un utilisateur AGENT de test s'il n'existe pas
        String agentEmail = "agent.pfe@example.com"; // Email unique pour l'agent
        Optional<User> userOpt = userRepository.findByEmail(agentEmail);

        if (userOpt.isEmpty()) {
            User agentUser = new User();
            agentUser.setUsername("agentPFE");
            // agentUser.setPassword(passwordEncoder.encode("agentpass")); // Quand vous aurez l'encodage
            agentUser.setPassword("agentpass"); // Mot de passe en clair pour test
            agentUser.setEmail(agentEmail);
            agentUser.setNom("AgentNom");
            agentUser.setPrenom("AgentPrenom");

            // Assigner le rôle à l'utilisateur (pour @ManyToOne Role role dans User.java)
            agentUser.setRole(agentRole);

            userRepository.save(agentUser);
            System.out.println("**************************************************************************************");
            System.out.println("DataInitializer: Utilisateur AGENT de test '" + agentEmail + "' CRÉÉ AVEC ID: " + agentUser.getId());
            System.out.println("!!! IMPORTANT POUR agence.js: UTILISEZ L'ID " + agentUser.getId() + " POUR 'utilisateurId' !!!");
            System.out.println("**************************************************************************************");
        } else {
            User existingAgent = userOpt.get();
            System.out.println("**************************************************************************************");
            System.out.println("DataInitializer: Utilisateur AGENT de test '" + agentEmail + "' EXISTE DÉJÀ AVEC ID: " + existingAgent.getId());
            if (existingAgent.getRole() != null) {
                System.out.println("  Son rôle est: " + existingAgent.getRole().getNom());
            } else {
                System.out.println("  ATTENTION: Cet utilisateur n'a pas de rôle assigné ! Vérifiez l'assignation.");
            }
            System.out.println("!!! IMPORTANT POUR agence.js: UTILISEZ L'ID " + existingAgent.getId() + " POUR 'utilisateurId' !!!");
            System.out.println("**************************************************************************************");
        }
    }
}