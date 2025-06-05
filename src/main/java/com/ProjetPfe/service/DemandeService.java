// src/main/java/com/ProjetPfe/service/DemandeService.java
package com.ProjetPfe.service;

import com.ProjetPfe.dto.ArticleDemandeDto;
import com.ProjetPfe.dto.DemandeCreateRequestDto;
import com.ProjetPfe.dto.DemandeResponseDto;
import com.ProjetPfe.model.*;
import com.ProjetPfe.repository.ArticleDemandeRepository;
import com.ProjetPfe.repository.DemandeRepository;
import com.ProjetPfe.repository.FichierJointRepository;
import com.ProjetPfe.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

// Imports pour PDF iText
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.ListItem;
// Nous utiliserons le nom complet pour com.itextpdf.layout.element.List pour éviter les conflits
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;


import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DemandeService {

    private final DemandeRepository demandeRepository;
    private final UserRepository userRepository;
    private final FichierJointRepository fichierJointRepository;
    private final ArticleDemandeRepository articleDemandeRepository;

    @Autowired
    public DemandeService(DemandeRepository demandeRepository,
                          UserRepository userRepository,
                          FichierJointRepository fichierJointRepository,
                          ArticleDemandeRepository articleDemandeRepository) {
        this.demandeRepository = demandeRepository;
        this.userRepository = userRepository;
        this.fichierJointRepository = fichierJointRepository;
        this.articleDemandeRepository = articleDemandeRepository;
    }

    @Transactional
    public DemandeResponseDto createDemande(DemandeCreateRequestDto demandeDto, List<MultipartFile> files) {
        User utilisateur = userRepository.findById(demandeDto.getUtilisateurId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé avec ID: " + demandeDto.getUtilisateurId()));

        Demande demande = new Demande();
        demande.setUtilisateur(utilisateur);
        // dateCreation et statut sont gérés par @PrePersist dans l'entité Demande
        demande.setCommentaire(demandeDto.getCommentaire());

        if (demandeDto.getArticles() != null) {
            for (ArticleDemandeDto articleDto : demandeDto.getArticles()) { // Correction ici (ArticleDemandeDto)
                ArticleDemande article = new ArticleDemande();
                article.setNomArticle(articleDto.getNomArticle());
                article.setDescription(articleDto.getDescription());
                article.setQuantite(articleDto.getQuantite());
                article.setUnite(articleDto.getUnite());
                demande.addArticleDemande(article);
            }
        }
        processAndStoreFilesInDatabase(files, demande);
        Demande savedDemande = demandeRepository.save(demande);
        return new DemandeResponseDto(savedDemande);
    }

    private void processAndStoreFilesInDatabase(List<MultipartFile> files, Demande demande) {
        if (files == null || files.isEmpty()) { return; }
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                try {
                    FichierJoint fichierJoint = new FichierJoint();
                    fichierJoint.setNomFichierOriginal(file.getOriginalFilename());
                    fichierJoint.setType(file.getContentType());
                    fichierJoint.setTaille(file.getSize());
                    // Assurez-vous que votre entité FichierJoint a @Column(name="contenu", columnDefinition="BYTEA")
                    fichierJoint.setContenu(file.getBytes());
                    demande.addFichierJoint(fichierJoint);
                } catch (IOException e) {
                    System.err.println("Échec de la lecture des octets du fichier '" + file.getOriginalFilename() + "': " + e.getMessage());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<DemandeResponseDto> getAllDemandes() {
        return demandeRepository.findAll().stream()
                .map(DemandeResponseDto::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DemandeResponseDto getDemandeById(Long id) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));
        return new DemandeResponseDto(demande);
    }

    @Transactional(readOnly = true)
    public Demande getDemandeEntityById(Long id) {
        return demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));
    }


    @Transactional(readOnly = true)
    public List<DemandeResponseDto> getDemandesByUtilisateurId(Long utilisateurId) {
        if (!userRepository.existsById(utilisateurId)) {
            return List.of();
        }
        return demandeRepository.findByUtilisateurId(utilisateurId).stream()
                .map(DemandeResponseDto::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public DemandeResponseDto updateDemande(Long id, DemandeCreateRequestDto demandeDtoToUpdate, List<MultipartFile> files) {
        Demande demandeExistante = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id + " pour mise à jour."));

        if (demandeExistante.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new IllegalStateException("Impossible de modifier la demande. Statut actuel : " +
                    demandeExistante.getStatut() + ". Modification autorisée uniquement pour le statut EN_ATTENTE.");
        }

        if (demandeDtoToUpdate.getCommentaire() != null) {
            demandeExistante.setCommentaire(demandeDtoToUpdate.getCommentaire());
        }

        articleDemandeRepository.deleteAll(demandeExistante.getArticlesDemandes());
        demandeExistante.getArticlesDemandes().clear();

        if (demandeDtoToUpdate.getArticles() != null) {
            for (ArticleDemandeDto articleDto : demandeDtoToUpdate.getArticles()) {
                ArticleDemande article = new ArticleDemande();
                article.setNomArticle(articleDto.getNomArticle());
                article.setDescription(articleDto.getDescription());
                article.setQuantite(articleDto.getQuantite());
                article.setUnite(articleDto.getUnite());
                demandeExistante.addArticleDemande(article);
            }
        }

        // Gestion de la mise à jour des fichiers (remplacement complet si de nouveaux fichiers sont fournis)
        if (files != null && !files.isEmpty()) {
            // 1. Supprimer les anciens fichiers joints de cette demande
            if (demandeExistante.getFichiersJoints() != null && !demandeExistante.getFichiersJoints().isEmpty()) {
                // Pour une suppression propre, itérer et supprimer via le repository ou s'assurer de la cascade
                // Si la relation Demande -> FichierJoint a orphanRemoval=true, vider la liste devrait suffire
                // avant d'ajouter les nouveaux. Sinon, supprimer explicitement.
                // fichierJointRepository.deleteAll(demandeExistante.getFichiersJoints()); // Option
                demandeExistante.getFichiersJoints().clear(); // Si orphanRemoval est bien configuré
            }
            // 2. Ajouter les nouveaux fichiers
            processAndStoreFilesInDatabase(files, demandeExistante);
        }
        // Si 'files' est vide ou null, et que vous voulez supprimer les fichiers existants,
        // vous devez ajouter une logique ici pour le faire explicitement.
        // La logique actuelle ne supprime les anciens que si de nouveaux sont envoyés.


        Demande updatedDemande = demandeRepository.save(demandeExistante);
        return new DemandeResponseDto(updatedDemande);
    }

    @Transactional
    public DemandeResponseDto cancelDemande(Long id) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));
        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new IllegalStateException("Impossible d'annuler la demande. Statut actuel : " +
                    demande.getStatut() + ". Annulation autorisée uniquement pour le statut EN_ATTENTE.");
        }
        demande.setStatut(StatutDemande.ANNULEE);
        String commentaireAnnulation = "Demande annulée le " + new SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date()) + ".";
        demande.setCommentaire(demande.getCommentaire() != null && !demande.getCommentaire().isEmpty() ? demande.getCommentaire() + "\n" + commentaireAnnulation : commentaireAnnulation);

        Demande cancelledDemande = demandeRepository.save(demande);
        return new DemandeResponseDto(cancelledDemande);
    }

    @Transactional
    public void deleteDemande(Long id) {
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id + " pour suppression."));

        if (demande.getStatut() != StatutDemande.EN_ATTENTE && demande.getStatut() != StatutDemande.ANNULEE && demande.getStatut() != StatutDemande.REJETEE) {
            throw new IllegalStateException("Impossible de supprimer la demande. Statut actuel : " +
                    demande.getStatut() + ".");
        }
        demandeRepository.deleteById(id);
        System.out.println("Demande ID " + id + " supprimée avec succès.");
    }
    @Transactional
    public DemandeResponseDto approuverDemande(Long id) {
        // 1. Récupérer la demande depuis la base de données
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));

        // 2. Vérifier si la demande est bien "EN ATTENTE"
        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new IllegalStateException("Impossible d'approuver la demande. Statut actuel : " +
                    demande.getStatut() + ". L'approbation est autorisée uniquement pour le statut EN_ATTENTE.");
        }

        // 3. Changer le statut
        demande.setStatut(StatutDemande.APPROUVEE);

        // 4. Sauvegarder les changements et retourner le DTO mis à jour
        Demande updatedDemande = demandeRepository.save(demande);
        return new DemandeResponseDto(updatedDemande);
    }

    @Transactional
    public DemandeResponseDto rejeterDemande(Long id) {
        // 1. Récupérer la demande
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));

        // 2. Vérifier si la demande est "EN ATTENTE"
        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new IllegalStateException("Impossible de rejeter la demande. Statut actuel : " +
                    demande.getStatut() + ". Le rejet est autorisé uniquement pour le statut EN_ATTENTE.");
        }

        // 3. Changer le statut
        demande.setStatut(StatutDemande.REJETEE);

        // 4. Sauvegarder et retourner le DTO
        Demande updatedDemande = demandeRepository.save(demande);
        return new DemandeResponseDto(updatedDemande);
    } @Transactional
    public DemandeResponseDto retournerDemande(Long id, String commentaireRetour) {
        // 1. Récupérer la demande
        Demande demande = demandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec ID: " + id));

        // 2. Vérifier si la demande est "EN ATTENTE"
        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new IllegalStateException("Impossible de retourner la demande. Statut actuel : " +
                    demande.getStatut() + ". Le retour est autorisé uniquement pour le statut EN_ATTENTE.");
        }

        // 3. Valider que le commentaire de retour n'est pas vide
        if (commentaireRetour == null || commentaireRetour.trim().isEmpty()) {
            throw new IllegalArgumentException("Un commentaire est requis pour retourner une demande.");
        }

        // 4. Changer le statut
        demande.setStatut(StatutDemande.RETOURNEE);

        // 5. Ajouter le commentaire de retour au commentaire existant pour garder un historique
        String dateRetour = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new java.util.Date());
        String nouveauCommentaire = String.format("\n--- RETOURNÉE LE %s ---\n%s", dateRetour, commentaireRetour);

        demande.setCommentaire(demande.getCommentaire() + nouveauCommentaire);

        // 6. Sauvegarder et retourner le DTO
        Demande updatedDemande = demandeRepository.save(demande);
        return new DemandeResponseDto(updatedDemande);
    }

    public Optional<FichierJoint> getFichierJointById(Long fichierId) {
        return fichierJointRepository.findById(fichierId);
    }

    @Transactional(readOnly = true)
    public byte[] exportDemandeToPdf(Long demandeId) {
        Demande demande = getDemandeEntityById(demandeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            document.add(new Paragraph("BON DE DEMANDE INTERNE")
                    .setTextAlignment(TextAlignment.CENTER).setBold().setFontSize(18).setMarginBottom(20));

            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
            document.add(new Paragraph("Référence: DEM-" + String.format("%05d", demande.getId())).setFontSize(10));
            document.add(new Paragraph("Date de création: " + (demande.getDateCreation() != null ? sdf.format(demande.getDateCreation()) : "N/A")).setFontSize(10));
            if (demande.getUtilisateur() != null) {
                document.add(new Paragraph("Demandeur: " +
                        (demande.getUtilisateur().getPrenom() != null ? demande.getUtilisateur().getPrenom() : "") + " " +
                        (demande.getUtilisateur().getNom() != null ? demande.getUtilisateur().getNom() : "") +
                        (demande.getUtilisateur().getEmail() != null ? " (Email: " + demande.getUtilisateur().getEmail() + ")" : "")
                ).setFontSize(10));
            }
            document.add(new Paragraph("Statut: " + (demande.getStatut() != null ? demande.getStatut().toString().replace("_", " ") : "N/A")).setFontSize(10).setMarginBottom(10));

            document.add(new Paragraph("Commentaire/Description de la demande:").setBold().setFontSize(12));
            document.add(new Paragraph(demande.getCommentaire() != null && !demande.getCommentaire().isEmpty() ? demande.getCommentaire() : "Aucun.").setFontSize(10).setMarginBottom(15));

            if (demande.getArticlesDemandes() != null && !demande.getArticlesDemandes().isEmpty()) {
                document.add(new Paragraph("Articles Demandés:").setBold().setFontSize(12).setMarginBottom(5));

                Table table = new Table(UnitValue.createPercentArray(new float[]{3, 1, 4}));
                table.setWidth(UnitValue.createPercentValue(100));

                table.addHeaderCell(new Cell().add(new Paragraph("Nom Article").setBold().setFontSize(10)));
                table.addHeaderCell(new Cell().add(new Paragraph("Quantité").setBold().setFontSize(10).setTextAlignment(TextAlignment.CENTER)));
                table.addHeaderCell(new Cell().add(new Paragraph("Spécifications").setBold().setFontSize(10)));

                for (ArticleDemande article : demande.getArticlesDemandes()) {
                    table.addCell(new Cell().add(new Paragraph(article.getNomArticle() != null ? article.getNomArticle() : "-").setFontSize(9)));
                    table.addCell(new Cell().add(new Paragraph(String.valueOf(article.getQuantite())).setFontSize(9).setTextAlignment(TextAlignment.CENTER)));
                    table.addCell(new Cell().add(new Paragraph(article.getDescription() != null && !article.getDescription().isEmpty() ? article.getDescription() : "-").setFontSize(9)));
                }
                document.add(table);
            } else {
                document.add(new Paragraph("Aucun article demandé.").setFontSize(10).setMarginTop(10));
            }

            if (demande.getFichiersJoints() != null && !demande.getFichiersJoints().isEmpty()) {
                document.add(new Paragraph("Fichiers Joints (Noms):").setBold().setFontSize(12).setMarginTop(15).setMarginBottom(5));
                com.itextpdf.layout.element.List listFichiers = new com.itextpdf.layout.element.List() // Nom complet
                        .setSymbolIndent(12).setListSymbol("- ");
                for (FichierJoint fichier : demande.getFichiersJoints()) {
                    listFichiers.add((ListItem) new ListItem(
                            (fichier.getNomFichierOriginal() != null ? fichier.getNomFichierOriginal() : "Fichier sans nom") +
                                    (fichier.getType() != null ? " (" + fichier.getType() + ")" : "")
                    ).setFontSize(10));
                }
                document.add(listFichiers);
            }

        } catch (Exception e) {
            System.err.println("Erreur lors de la génération du PDF pour la demande ID " + demandeId + ": " + e.getMessage());
            e.printStackTrace();
            return new byte[0];
        }
        return baos.toByteArray();
    }
}