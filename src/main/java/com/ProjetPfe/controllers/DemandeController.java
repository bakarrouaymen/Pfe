// src/main/java/com/ProjetPfe/controllers/DemandeController.java
package com.ProjetPfe.controllers;

import com.ProjetPfe.dto.DemandeCreateRequestDto;
import com.ProjetPfe.dto.DemandeResponseDto;
import com.ProjetPfe.model.FichierJoint;
import com.ProjetPfe.service.DemandeService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/demandes")
@CrossOrigin(origins = "*")
public class DemandeController {

    private final DemandeService demandeService;

    @Autowired
    public DemandeController(DemandeService demandeService) {
        this.demandeService = demandeService;
    }

    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<DemandeResponseDto> createDemande(
            @RequestPart("demande") DemandeCreateRequestDto demandeDto,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        try {
            DemandeResponseDto nouvelleDemandeDto = demandeService.createDemande(demandeDto, files);
            return new ResponseEntity<>(nouvelleDemandeDto, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<DemandeResponseDto>> getAllDemandes() {
        try {
            List<DemandeResponseDto> demandes = demandeService.getAllDemandes();
            if (demandes.isEmpty()) {
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            }
            return new ResponseEntity<>(demandes, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<DemandeResponseDto> getDemandeById(@PathVariable Long id) {
        try {
            DemandeResponseDto demandeDto = demandeService.getDemandeById(id);
            return new ResponseEntity<>(demandeDto, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<DemandeResponseDto>> getDemandesByUtilisateur(@PathVariable Long utilisateurId) {
        try {
            List<DemandeResponseDto> demandes = demandeService.getDemandesByUtilisateurId(utilisateurId);
            if (demandes.isEmpty()) {
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            }
            return new ResponseEntity<>(demandes, HttpStatus.OK);
        }
        catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Modifié pour accepter multipart/form-data si la modification de fichiers est souhaitée
    @PutMapping(value = "/{id}", consumes = {MediaType.MULTIPART_FORM_DATA_VALUE})
    public ResponseEntity<DemandeResponseDto> updateDemande(
            @PathVariable Long id,
            @RequestPart("demande") DemandeCreateRequestDto demandeDto, // DTO avec les infos à jour
            @RequestPart(value = "files", required = false) List<MultipartFile> files) { // Pour les nouveaux fichiers
        try {
            DemandeResponseDto demandeMiseAJour = demandeService.updateDemande(id, demandeDto, files);
            return new ResponseEntity<>(demandeMiseAJour, HttpStatus.OK);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<DemandeResponseDto> cancelDemande(@PathVariable Long id) {
        try {
            DemandeResponseDto demandeAnnulee = demandeService.cancelDemande(id);
            return new ResponseEntity<>(demandeAnnulee, HttpStatus.OK);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDemande(@PathVariable Long id) {
        try {
            demandeService.deleteDemande(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/fichiers/{fichierId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fichierId) {
        Optional<FichierJoint> fichierOpt = demandeService.getFichierJointById(fichierId);
        if (fichierOpt.isPresent()) {
            FichierJoint fichierJoint = fichierOpt.get();
            if (fichierJoint.getContenu() == null || fichierJoint.getContenu().length == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            ByteArrayResource resource = new ByteArrayResource(fichierJoint.getContenu());
            String nomFichierOriginal = fichierJoint.getNomFichierOriginal() != null ? fichierJoint.getNomFichierOriginal() : "fichier_telecharge";
            String contentType = fichierJoint.getType() != null ? fichierJoint.getType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomFichierOriginal + "\"")
                    .body(resource);
        } else {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier non trouvé avec l'ID: " + fichierId);
        }
    }

    @GetMapping("/{id}/export/pdf")
    public ResponseEntity<byte[]> exportDemandePdf(@PathVariable Long id) {
        try {
            byte[] pdfBytes = demandeService.exportDemandeToPdf(id);
            if (pdfBytes == null || pdfBytes.length == 0) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = "demande_" + id + ".pdf";
            headers.setContentDispositionFormData(filename, filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}