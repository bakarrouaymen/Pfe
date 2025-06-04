package com.ProjetPfe.service;

import com.ProjetPfe.dto.ArticleDemandeDto;
import com.ProjetPfe.dto.ArticleDemandeResponseDto;
import com.ProjetPfe.dto.DemandeCreateRequestDto;
import com.ProjetPfe.dto.DemandeResponseDto;
import com.ProjetPfe.model.Demande;
import com.ProjetPfe.model.User;
import com.ProjetPfe.model.ArticleDemande;
import com.ProjetPfe.model.StatutDemande;
import com.ProjetPfe.repository.DemandeRepository;
import com.ProjetPfe.repository.UserRepository;
import com.ProjetPfe.repository.FichierJointRepository; // Même si non utilisé dans ce premier test, on le mocke car c'est une dépendance

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile; // Pour la liste de fichiers

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class) // Intègre Mockito avec JUnit 5
public class DemandeServiceTest {

    @Mock // Crée un mock pour DemandeRepository
    private DemandeRepository demandeRepositoryMock;

    @Mock // Crée un mock pour UserRepository
    private UserRepository userRepositoryMock;

    @Mock // Crée un mock pour FichierJointRepository
    private FichierJointRepository fichierJointRepositoryMock;

    @InjectMocks // Injecte les mocks ci-dessus dans DemandeService
    private DemandeService demandeService; // La classe que nous testons (version sans interface/impl)

    private User utilisateurTest;
    private DemandeCreateRequestDto demandeDtoTest;
    private List<MultipartFile> fichiersTest;

    @BeforeEach
    void setUp() {
        // Initialisation des objets de test communs
        // (Nous utilisons la version de User avec Set<Role> pour cet exemple)
        utilisateurTest = new User();
        utilisateurTest.setId(1L);
        utilisateurTest.setUsername("agentTest");
        utilisateurTest.setEmail("agent@test.com");
        utilisateurTest.setPassword("password");
        // Si vous avez un constructeur qui prend tous les arguments, utilisez-le.
        // Assurez-vous que l'entité Role est aussi disponible ou mockée si nécessaire
        // pour la création de l'utilisateur. Pour simplifier ici, on suppose qu'un User peut être créé sans rôle initial
        // ou que vous avez une logique pour l'assigner.
        // Role agentRole = new Role(1L, "ROLE_AGENT");
        // utilisateurTest.setRoles(new HashSet<>(List.of(agentRole)));


        demandeDtoTest = new DemandeCreateRequestDto();
        demandeDtoTest.setUtilisateurId(utilisateurTest.getId());
        demandeDtoTest.setCommentaire("Ceci est une demande de test");

        List<ArticleDemandeResponseDto> articlesDto = new ArrayList<>();
        ArticleDemandeResponseDto article1 = new ArticleDemandeResponseDto("PC Portable", "Core i7, 16GB RAM", 2, "unité");
        articlesDto.add(article1);
        demandeDtoTest.setArticles(articlesDto);

        fichiersTest = new ArrayList<>(); // Pour l'instant, une liste vide de fichiers
        // Vous pourriez ajouter des mocks de MultipartFile si vous testez la logique de fichier en détail.
    }

    @Test
    void testCreateDemande_Success() {
        // 1. Préparation (Arrange)

        // Comportement attendu du mock userRepositoryMock
        when(userRepositoryMock.findById(utilisateurTest.getId())).thenReturn(Optional.of(utilisateurTest));

        // Comportement attendu du mock demandeRepositoryMock
        // On s'attend à ce que save retourne une Demande avec un ID généré, la date, etc.
        // Pour cela, nous devons simuler ce que la méthode save ferait.
        // Le plus simple est de retourner l'objet Demande passé à save, après avoir simulé quelques modifications.
        when(demandeRepositoryMock.save(any(Demande.class))).thenAnswer(invocation -> {
            Demande demandeSauvegardee = invocation.getArgument(0);
            demandeSauvegardee.setId(100L); // Simule un ID généré
            // La date de création et le statut sont normalement mis dans le service ou par @PrePersist
            // Si le service les met explicitement, on n'a pas besoin de le simuler ici.
            // Si c'est @PrePersist, c'est plus difficile à tester unitairement sans faire appel à un contexte JPA.
            // Pour ce test, on va supposer que le service initialise bien la date et le statut.
            if(demandeSauvegardee.getDateCreation() == null) demandeSauvegardee.setDateCreation(new Date());
            if(demandeSauvegardee.getStatut() == null) demandeSauvegardee.setStatut(StatutDemande.EN_ATTENTE);
            return demandeSauvegardee;
        });

        // 2. Action (Act)
        DemandeResponseDto resultatDemande = demandeService.createDemande(demandeDtoTest, fichiersTest);

        // 3. Vérification (Assert)
        assertNotNull(resultatDemande);
        assertNotNull(resultatDemande.getId()); // Vérifie que l'ID a été assigné
        assertEquals(StatutDemande.EN_ATTENTE, resultatDemande.getStatut());
        assertEquals(utilisateurTest.getId(), resultatDemande.getUtilisateur().getId());
        assertEquals(demandeDtoTest.getCommentaire(), resultatDemande.getCommentaire());
        assertNotNull(resultatDemande.getDateCreation());
        assertEquals(1, resultatDemande.getArticlesDemandes().size()); // Vérifie le nombre d'articles

        ArticleDemandeResponseDto premierArticle = resultatDemande.getArticlesDemandes().get(0);
        assertEquals("PC Portable", premierArticle.getNomArticle());
        assertEquals(2, premierArticle.getQuantite());
        assertNotNull(premierArticle.getDemande()); // Vérifie la liaison bidirectionnelle

        // Vérifier que userRepository.findById a été appelé une fois avec le bon ID
        verify(userRepositoryMock, times(1)).findById(utilisateurTest.getId());
        // Vérifier que demandeRepository.save a été appelé une fois
        verify(demandeRepositoryMock, times(1)).save(any(Demande.class));
    }

    @Test
    void testCreateDemande_UtilisateurNonTrouve() {
        // 1. Arrange
        Long utilisateurIdInexistant = 99L;
        demandeDtoTest.setUtilisateurId(utilisateurIdInexistant);
        when(userRepositoryMock.findById(utilisateurIdInexistant)).thenReturn(Optional.empty());

        // 2. Act & 3. Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            demandeService.createDemande(demandeDtoTest, fichiersTest);
        });

        assertEquals("Utilisateur non trouvé avec ID: " + utilisateurIdInexistant, exception.getMessage());

        // Vérifier qu'aucune sauvegarde de demande n'a eu lieu
        verify(demandeRepositoryMock, never()).save(any(Demande.class));
    }

    // TODO: Ajouter d'autres tests pour les autres méthodes de DemandeService
    // - testGetDemandeById_Success
    // - testGetDemandeById_NotFound
    // - testGetAllDemandes
    // - testGetAllDemandes_Empty
    // - testGetDemandesByUtilisateurId
    // - testUpdateDemande_Success
    // - testUpdateDemande_StatutNonModifiable
    // - testUpdateDemande_DemandeNonTrouvee
    // - testCancelDemande_Success
    // - testCancelDemande_StatutNonAnnulable
    // - testCancelDemande_DemandeNonTrouvee
    // - testCreateDemande_AvecFichiers (plus complexe, nécessite de mocker MultipartFile)
}