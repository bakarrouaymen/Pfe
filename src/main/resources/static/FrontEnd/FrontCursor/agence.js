// agence.js (Version complète et modifiée pour débogage détails et statistiques, et autres fonctionnalités)
document.addEventListener('DOMContentLoaded', function() {
    // --- Sélecteurs ---
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const mainSections = document.querySelectorAll('.main-content section');
    const demandsTableBody = document.querySelector('#demandes-en-cours tbody');
    const historyTableBody = document.querySelector('#historique tbody');
    const demandsFilterInput = document.querySelector('#demandes-en-cours .filter-input');
    const demandsStatusFilter = document.querySelector('#demandes-en-cours .status-filter');
    const demandsDateFilter = document.querySelector('#demandes-en-cours .date-filter');
    const notificationBell = document.querySelector('.notification-bell');
    const notificationBadge = document.querySelector('.notification-badge');

    // Modal pour les détails
    const demandDetailsModal = document.getElementById('demandDetailsModal');

    // Éléments du formulaire de création/modification
    const nouvelleDemandeSection = document.getElementById('nouvelle-demande');
    const requestForm = document.getElementById('requestForm');
    const requestFormTitleElement = document.querySelector('#nouvelle-demande h2');
    let demandeIdHiddenInput = document.getElementById('editingDemandeId');

    if (requestForm && !demandeIdHiddenInput) {
        demandeIdHiddenInput = document.createElement('input');
        demandeIdHiddenInput.type = 'hidden';
        demandeIdHiddenInput.id = 'editingDemandeId';
        requestForm.appendChild(demandeIdHiddenInput);
    }

    let utilisateurIdConnecte;
    let demandsChartInstance = null; // Pour garder une référence au graphique et le mettre à jour/détruire


    // /////////////////////////////////////////////////////////////////////////////
    // FONCTIONS POUR CHARGER ET AFFICHER LES DEMANDES DEPUIS L'API
    // /////////////////////////////////////////////////////////////////////////////
    async function chargerEtAfficherDemandesUtilisateur(utilisateurId) {
        if (!utilisateurId) {
            console.error("UTILISATEUR ID MANQUANT: Impossible de charger les demandes.");
            if (demandsTableBody) demandsTableBody.innerHTML = '<tr><td colspan="5">ID utilisateur non défini.</td></tr>';
            if (historyTableBody) historyTableBody.innerHTML = '<tr><td colspan="5">ID utilisateur non défini.</td></tr>';
            return;
        }
        try {
            console.log(`Chargement des demandes pour l'utilisateur ID: ${utilisateurId}`);
            const response = await fetch(`/api/demandes/utilisateur/${utilisateurId}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
            }

            const demandes = await response.json();
            console.log("Demandes récupérées:", demandes);

            // Mettre à jour le tableau de bord (widgets ET graphique)
            if (typeof mettreAJourTableauDeBord === "function") {
                mettreAJourTableauDeBord(demandes);
            }

            const demandesEnCours = demandes.filter(d => d.statut !== 'TERMINEE' && d.statut !== 'ANNULEE' && d.statut !== 'REJETEE' && d.statut !== 'REJETEE_SUCCURSALE');
            const demandesHistorique = demandes.filter(d => d.statut === 'TERMINEE' || d.statut === 'ANNULEE' || d.statut === 'REJETEE' || d.statut === 'REJETEE_SUCCURSALE');

            if (demandsTableBody) afficherDemandesDansTableau(demandesEnCours, demandsTableBody, "demandesEnCours");
            else console.warn("Élément tbody pour #demandes-en-cours non trouvé.");

            if (historyTableBody) afficherDemandesDansTableau(demandesHistorique, historyTableBody, "historique");
            else console.warn("Élément tbody pour #historique non trouvé.");

        } catch (error) {
            console.error('Erreur lors du chargement des demandes:', error);
            if (demandsTableBody) demandsTableBody.innerHTML = `<tr><td colspan="5">Erreur chargement. Vérifiez la console.</td></tr>`;
            if (historyTableBody) historyTableBody.innerHTML = `<tr><td colspan="5">Erreur chargement. Vérifiez la console.</td></tr>`;
        }
    }

    function afficherDemandesDansTableau(listeDemandes, tbodyElement, typeTableau) {
        if (!tbodyElement) {
            console.warn("L'élément tbody pour la table '" + typeTableau + "' est introuvable.");
            return;
        }
        tbodyElement.innerHTML = '';
        if (!listeDemandes || listeDemandes.length === 0) {
            tbodyElement.innerHTML = '<tr><td colspan="5">Aucune demande à afficher.</td></tr>';
            return;
        }
        listeDemandes.forEach(demande => {
            const tr = document.createElement('tr');
            tr.dataset.id = demande.id;
            tr.dataset.fullDemande = JSON.stringify(demande);
            let dateFormatee = 'N/A';
            if (demande.dateCreation) {
                try {
                    const dateObj = new Date(demande.dateCreation);
                    if (!isNaN(dateObj.getTime())) {
                        dateFormatee = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                    } else { dateFormatee = demande.dateCreation; }
                } catch (e) { dateFormatee = demande.dateCreation; }
            }
            const description = demande.commentaire || 'Pas de commentaire';
            const reference = `DEM-${String(demande.id).padStart(5, '0')}`;
            tr.innerHTML = `
                <td>${reference}</td>
                <td>${description.substring(0, 70)}${description.length > 70 ? '...' : ''}</td>
                <td>${dateFormatee}</td>
                <td>${getStatusHTML(demande.statut)}</td>
                <td>
                    <button class="action-button view-details-button" title="Voir les détails"><i class="fas fa-eye"></i></button>
                    <a href="/api/demandes/${demande.id}/export/pdf" target="_blank" class="action-button export-pdf-button" title="Exporter en PDF">
                        <i class="fas fa-file-pdf"></i>
                    </a>
                    ${demande.statut === 'EN_ATTENTE' ? `
                    <button class="action-button modify-button" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="action-button delete-button" title="Supprimer"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </td>
            `;
            tbodyElement.appendChild(tr);
        });
    }

    // --- Utilitaires ---
    function getStatusHTML(statusKeyJava) {
        const statusKey = statusKeyJava ? statusKeyJava.toLowerCase().replace(/_/g, '-') : 'en-attente';
        const statusConfig = {
            'en-attente': { icon: 'clock', text: 'En attente', classCss: 'status-pending' },
            'approuvee': { icon: 'check-circle', text: 'Approuvée', classCss: 'status-approved' },
            'rejetee': { icon: 'times-circle', text: 'Rejetée', classCss: 'status-rejected' },
            'annulee': { icon: 'times-circle', text: 'Annulée', classCss: 'status-rejected' },
            'en-cours': { icon: 'cogs', text: 'En cours', classCss: 'status-processing' },
            'terminee': { icon: 'flag-checkered', text: 'Terminée', classCss: 'status-completed' },
            'en-cours-validation-succursale': { icon: 'building', text: 'Validation Succursale', classCss: 'status-pending' },
            'en-cours-traitement-it': { icon: 'desktop', text: 'Traitement IT', classCss: 'status-processing' },
            'en-attente-devis': { icon: 'file-invoice-dollar', text: 'Attente Devis', classCss: 'status-pending' },
            'devis-soumis': { icon: 'file-signature', text: 'Devis Soumis', classCss: 'status-pending' },
            'bc-emis': { icon: 'file-contract', text: 'BC Emis', classCss: 'status-processing' },
            'livraison-succursale': { icon: 'truck', text: 'Livraison Succursale', classCss: 'status-delivery' },
            'livraison-agence': { icon: 'truck-loading', text: 'Livraison Agence', classCss: 'status-delivery' },
            'rejetee-succursale': { icon: 'times-circle', text: 'Rejetée Succursale', classCss: 'status-rejected' }
        };
        const config = statusConfig[statusKey] || { icon: 'question-circle', text: statusKeyJava, classCss: 'status-unknown' };
        return `<span class="status ${config.classCss}"><i class="fas fa-${config.icon}"></i> ${config.text}</span>`;
    }

    // --- Navigation ---
    function setupNavigation() {
        if (!sidebarLinks || sidebarLinks.length === 0 || !mainSections || mainSections.length === 0) {
            console.warn("Éléments de navigation (sidebarLinks ou mainSections) non trouvés.");
            return;
        }
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                mainSections.forEach(section => section.style.display = 'none');
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                    if (targetId === 'nouvelle-demande' && requestForm) {
                        if (requestForm.dataset.mode !== "editOnClick") {
                            if (requestFormTitleElement) requestFormTitleElement.innerHTML = '<i class="fas fa-plus-circle"></i> Créer une Nouvelle Demande';
                            const submitButton = requestForm.querySelector('button[type="submit"]');
                            if (submitButton) submitButton.textContent = 'Soumettre la demande';
                            if(demandeIdHiddenInput) demandeIdHiddenInput.value = '';
                            requestForm.reset();
                            const itemsContainer = requestForm.querySelector('.items-container');
                            const fileListDisplay = requestForm.querySelector('.file-list');
                            if(itemsContainer) itemsContainer.innerHTML = '';
                            if(fileListDisplay) fileListDisplay.innerHTML = '<span>Aucun fichier sélectionné.</span>';
                        }
                        if (requestForm.dataset.mode === "editOnClick") {
                           delete requestForm.dataset.mode;
                        }
                    }
                } else {
                    console.warn(`Section cible '${targetId}' non trouvée.`);
                }
                sidebarLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
        const defaultLink = document.querySelector('.sidebar a[href="#dashboard"]');
        if (defaultLink) {
            defaultLink.click();
        } else if (sidebarLinks.length > 0) {
            sidebarLinks[0].click();
        }
    }

    // --- Filtrage (Basique, à améliorer) ---
    // Dans agence.js

    function setupTableFilter() {
        // Sélecteurs pour les filtres de la section "Demandes en cours"
        const filterInputDemandes = document.querySelector('#demandes-en-cours .filter-input');
        const statusFilterDemandes = document.querySelector('#demandes-en-cours .status-filter');
        const dateFilterDemandes = document.querySelector('#demandes-en-cours .date-filter');
        // Le tbody est déjà défini globalement comme demandsTableBody

        if (!demandsTableBody) {
            console.warn("Le tbody pour la table des demandes en cours est introuvable.");
            return;
        }
        if (!filterInputDemandes || !statusFilterDemandes || !dateFilterDemandes) {
            console.warn("Un ou plusieurs champs de filtre pour les demandes en cours sont manquants.");
            // On peut continuer sans tous les filtres, la fonction filterDemands vérifiera leur existence
        }

        function filterDemandesEnCours() {
            const searchText = filterInputDemandes ? filterInputDemandes.value.toLowerCase() : "";
            const statusValue = statusFilterDemandes ? statusFilterDemandes.value : ""; // ex: "EN_ATTENTE", "APPROUVEE" (valeur de l'option)
            const dateValue = dateFilterDemandes ? dateFilterDemandes.value : ""; // ex: "2025-06-04"

            demandsTableBody.querySelectorAll('tr').forEach(row => {
                if (row.querySelectorAll('td').length <= 1) { // Ignorer les lignes "Aucune demande..."
                    // S'assurer que la ligne "Aucune demande..." reste visible si elle est la seule
                    if (demandsTableBody.querySelectorAll('tr:not([style*="display: none"]) td[colspan="5"]').length === 1 &&
                        demandsTableBody.querySelector('tr td[colspan="5"]')) {
                         // Ne rien faire si c'est la seule ligne visible et qu'elle dit "Aucune demande"
                    } else if (row.querySelector('td[colspan="5"]')) {
                         row.style.display = 'none'; // Masquer la ligne "Aucune demande..." s'il y a d'autres lignes filtrées
                    }
                    return;
                }

                const cells = row.cells;
                // Colonne 1: Description (Commentaire)
                const descriptionText = cells[1] ? cells[1].textContent.toLowerCase() : "";
                // Colonne 2: Date de création
                const dateCellText = cells[2] ? cells[2].textContent : ""; // Format YYYY-MM-DD
                // Colonne 3: Statut (on va lire la valeur du statut brut stockée dans le DTO)
                let statutDemande = "";
                try {
                    const demandeData = JSON.parse(row.dataset.fullDemande);
                    statutDemande = demandeData.statut ? demandeData.statut.toUpperCase() : ""; // Ex: "EN_ATTENTE"
                } catch(e) {
                    console.warn("Impossible de parser fullDemande pour le filtrage", row.dataset.fullDemande, e);
                }


                const matchesSearch = !searchText || descriptionText.includes(searchText);

                // Pour le statut, la valeur du filtre (statusValue) doit correspondre à la valeur du statut de la demande
                // Les options de votre <select class="status-filter"> dans agence.html ont des valeurs comme "pending", "approved".
                // Votre getStatusHTML et votre backend utilisent "EN_ATTENTE", "APPROUVEE".
                // Il faut une correspondance. Soit les <option value="..."> utilisent les mêmes clés que le backend,
                // soit on mappe ici. Pour l'instant, je suppose que les 'value' du select correspondent aux statuts du backend.
                const matchesStatus = !statusValue || statutDemande === statusValue;

                const matchesDate = !dateValue || (dateCellText === dateValue);

                row.style.display = matchesSearch && matchesStatus && matchesDate ? '' : 'none';
            });
        }

        if (filterInputDemandes) filterInputDemandes.addEventListener('input', filterDemandesEnCours);
        if (statusFilterDemandes) statusFilterDemandes.addEventListener('change', filterDemandesEnCours);
        if (dateFilterDemandes) dateFilterDemandes.addEventListener('input', filterDemandesEnCours); // 'input' pour réagir dès que la date change
    }

    function setupHistoryFilter() {
        const historyFilterInput = document.querySelector('#historique .filter-input');
        const historyStatusFilter = document.querySelector('#historique .status-filter');
        const historyDateFilter = document.querySelector('#historique .date-filter');
        if (!historyTableBody) return;

        function applyHistoryFilters() {
            const searchText = historyFilterInput ? historyFilterInput.value.toLowerCase() : "";
            const statusValue = historyStatusFilter ? historyStatusFilter.value : "";
            const dateValue = historyDateFilter ? historyDateFilter.value : "";
            historyTableBody.querySelectorAll('tr').forEach(row => {
                if (row.querySelectorAll('td').length <= 1) return;
                const cells = row.cells;
                const description = cells[1] ? cells[1].textContent.toLowerCase() : "";
                const date = cells[2] ? cells[2].textContent : "";
                const statusElement = cells[3] ? cells[3].querySelector('.status') : null;
                const statusText = statusElement ? statusElement.textContent.toLowerCase() : "";
                const matchesSearch = description.includes(searchText);
                const matchesStatus = !statusValue || statusText.includes(statusValue.toLowerCase());
                const matchesDate = !dateValue || date === dateValue;
                row.style.display = matchesSearch && matchesStatus && matchesDate ? '' : 'none';
            });
        }
        if(historyFilterInput) historyFilterInput.addEventListener('input', applyHistoryFilters);
        if(historyStatusFilter) historyStatusFilter.addEventListener('change', applyHistoryFilters);
        if(historyDateFilter) historyDateFilter.addEventListener('change', applyHistoryFilters);
    }

    // --- Affichage des détails de la demande (AVEC LOGS DE DÉBOGAGE) ---
    function showDemandDetailsFromRow(demandeString) {
        console.log("showDemandDetailsFromRow appelée. Données reçues (chaîne JSON):", demandeString);
        if (!demandDetailsModal) {
            console.error("Modal 'demandDetailsModal' non trouvé. Impossible d'afficher les détails.");
            return;
        }
        try {
            const demande = JSON.parse(demandeString);
            console.log("Données parsées pour les détails (objet):", demande);

            const modalDemandIdEl = document.getElementById('modalDemandId');
            const modalDemandDescriptionEl = document.getElementById('modalDemandDescription');
            const modalDemandDateEl = document.getElementById('modalDemandDate');
            const modalDemandStatusEl = document.getElementById('modalDemandStatus');
            const itemsTableBodyEl = document.getElementById('modalDemandItems');
            const filesListModalEl = document.getElementById('modalDemandFiles');

            if (!modalDemandIdEl || !modalDemandDescriptionEl || !modalDemandDateEl || !modalDemandStatusEl || !itemsTableBodyEl || !filesListModalEl) {
                console.error("Un ou plusieurs éléments du modal de détails sont manquants dans le HTML.");
                alert("Erreur d'interface: Impossible d'afficher tous les détails.");
                return;
            }

            modalDemandIdEl.textContent = `DEM-${String(demande.id).padStart(5, '0')}`;
            modalDemandDescriptionEl.textContent = demande.commentaire || 'Pas de commentaire';
            let dateSoumissionFormatee = 'N/A';
            if(demande.dateCreation) {
                 const dateObj = new Date(demande.dateCreation);
                 if (!isNaN(dateObj.getTime())) {
                    dateSoumissionFormatee = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                 } else {
                    console.warn("Date de création invalide reçue pour le modal:", demande.dateCreation);
                    dateSoumissionFormatee = demande.dateCreation;
                }
            }
            modalDemandDateEl.textContent = dateSoumissionFormatee;
            modalDemandStatusEl.innerHTML = getStatusHTML(demande.statut);

            itemsTableBodyEl.innerHTML = '';
            if (demande.articlesDemandes && demande.articlesDemandes.length > 0) {
                demande.articlesDemandes.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${item.nomArticle || '-'}</td><td>${item.quantite || '-'}</td><td>${item.description || '-'}</td>`;
                    itemsTableBodyEl.appendChild(row);
                });
            } else {
                itemsTableBodyEl.innerHTML = '<tr><td colspan="3">Aucun article pour cette demande.</td></tr>';
            }

            filesListModalEl.innerHTML = '';
            if (demande.fichiersJoints && demande.fichiersJoints.length > 0) {
                demande.fichiersJoints.forEach(fichier => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${fichier.nomFichierOriginal || 'Fichier sans nom'} (${fichier.taille ? (fichier.taille / 1024).toFixed(2) + ' KB' : 'Taille inconnue'})</span>
                        <a href="/api/demandes/fichiers/${fichier.id}" target="_blank" class="action-button" title="Télécharger">
                            <i class="fas fa-download"></i>
                        </a>
                    `;
                    filesListModalEl.appendChild(li);
                });
            } else {
                 filesListModalEl.innerHTML = '<li>Aucun fichier joint.</li>';
            }
            demandDetailsModal.style.display = 'block';
            console.log("Modal des détails affiché pour la demande ID:", demande.id);
        } catch (error) {
            console.error("Erreur lors de l'affichage des détails (parsing JSON ou autre):", error);
            alert("Impossible d'afficher les détails. Vérifiez la console.");
        }
    }

    // --- Préparation pour la modification ---
    function preparerModificationDemande(demandeId, demandeDataString) {
        const demande = JSON.parse(demandeDataString);
        if (!requestForm || !nouvelleDemandeSection || !requestFormTitleElement || !demandeIdHiddenInput) {
            console.error("Formulaire de modification ou ses éléments sont introuvables.");
            return;
        }
        requestFormTitleElement.innerHTML = `<i class="fas fa-edit"></i> Modifier la Demande ID: ${demandeId}`;
        const submitButton = requestForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Enregistrer les modifications';
        demandeIdHiddenInput.value = demandeId;
        const requestDescriptionInput = document.getElementById('requestDescription');
        if (requestDescriptionInput) requestDescriptionInput.value = demande.commentaire || "";
        const itemsContainer = requestForm.querySelector('.items-container');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            if (demande.articlesDemandes && demande.articlesDemandes.length > 0) {
                demande.articlesDemandes.forEach(article => {
                    const itemRow = document.createElement('div');
                    itemRow.className = 'item-row';
                    itemRow.innerHTML = `
                        <input type="text" class="item-name" placeholder="Nom de l'article" value="${article.nomArticle || ''}" required>
                        <input type="number" class="item-quantity" placeholder="Qté" min="1" value="${article.quantite || 1}" required>
                        <input type="text" class="item-specs" placeholder="Spécifications (optionnel)" value="${article.description || ''}">
                        <button type="button" class="remove-item-btn action-button" title="Supprimer"><i class="fas fa-times"></i></button>
                    `;
                    itemsContainer.appendChild(itemRow);
                });
            }
        }
        const fileUpload = document.getElementById('fileUpload');
        const fileListDisplay = requestForm.querySelector('.file-list');
        if (fileUpload) fileUpload.value = "";
        if (fileListDisplay) {
            let existingFilesHTML = '<p style="font-size: 0.9em; margin-bottom: 5px;">Fichiers actuellement joints (non modifiables ici) :</p><ul>';
            if (demande.fichiersJoints && demande.fichiersJoints.length > 0) {
                demande.fichiersJoints.forEach(fj => {
                    existingFilesHTML += `<li style="font-size: 0.85em;">${fj.nomFichierOriginal}</li>`;
                });
                 existingFilesHTML += '</ul><p style="font-size: 0.9em; margin-top: 10px;">Pour modifier/ajouter, sélectionnez de nouveaux fichiers.</p>';
            } else {
                existingFilesHTML = '<span>Aucun fichier actuellement joint. Sélectionnez des fichiers pour les ajouter.</span>'
            }
            fileListDisplay.innerHTML = existingFilesHTML;
        }
        requestForm.dataset.mode = "editOnClick";
        const targetLink = document.querySelector(`.sidebar a[href="#nouvelle-demande"]`);
        if(targetLink) targetLink.click();
    }

    // --- Gestion des actions sur les demandes ---
    function setupDemandActions() {
        const tablesPourActions = [demandsTableBody, historyTableBody];
        tablesPourActions.forEach(tableBody => {
            if (!tableBody) return;
            tableBody.addEventListener('click', async function(e) {
                const button = e.target.closest('.action-button');
                if (!button) return;
                if (button.tagName === 'A' && button.classList.contains('export-pdf-button')) return;
                e.preventDefault();
                const row = button.closest('tr');
                const demandeIdString = row ? row.dataset.id : null;
                const fullDemandeString = row ? row.dataset.fullDemande : null;
                if (!demandeIdString) return;

                if (button.classList.contains('view-details-button')) {
                    if (fullDemandeString) showDemandDetailsFromRow(fullDemandeString);
                    else { fetch(`/api/demandes/${demandeIdString}`).then(res => res.ok ? res.json() : Promise.reject(res)).then(data => showDemandDetailsFromRow(JSON.stringify(data))).catch(err => console.error("Erreur détails API:", err)); }
                } else if (button.classList.contains('modify-button')) {
                    if (fullDemandeString) preparerModificationDemande(demandeIdString, fullDemandeString);
                    else alert("Données non disponibles pour modification.");
                } else if (button.classList.contains('delete-button')) {
                    if (confirm('Supprimer la demande ID: ' + demandeIdString + ' ?')) {
                        try {
                            const response = await fetch(`/api/demandes/${demandeIdString}`, { method: 'DELETE' });
                            if (response.ok) {
                                alert('Demande ID: ' + demandeIdString + ' supprimée.');
                                chargerEtAfficherDemandesUtilisateur(utilisateurIdConnecte);
                            } else {
                                const errorText = await response.text();
                                alert(`Erreur suppression: ${response.status} - ${errorText || "Cause inconnue"}`);
                            }
                        } catch (error) { alert('Erreur réseau lors de la suppression.'); }
                    }
                }
            });
        });
    }

    // --- Gestion des modals ---
    function setupModals() {
        if (!demandDetailsModal) {
            console.warn("Modal 'demandDetailsModal' non trouvé pour setupModals.");
            return;
        }
        document.querySelectorAll('.modal .close-modal, .modal .close-button').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
        window.addEventListener('click', e => { if (e.target === demandDetailsModal) demandDetailsModal.style.display = 'none'; });
    }

    // --- Gestion des notifications ---
    function setupNotifications() {
        const notificationListElement = document.querySelector('#notifications .notification-list');
        if (!notificationListElement || !notificationBadge) {
            console.warn("Éléments de notification (liste ou badge) non trouvés.");
            return;
        }
        function updateNotificationCount(listElement) {
            const unreadCount = listElement.querySelectorAll('li.notification-item.unread').length;
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        notificationListElement.addEventListener('click', function(e) {
            const targetButton = e.target.closest('.mark-read-btn');
            if (targetButton) {
                const targetLi = targetButton.closest('li.notification-item.unread');
                if (targetLi) {
                    targetLi.classList.remove('unread');
                    updateNotificationCount(notificationListElement);
                }
            }
        });
        if (notificationListElement.querySelector('li.notification-item')) {
             updateNotificationCount(notificationListElement);
        }
    }

    // --- Configuration du graphique (AVEC LOGS DE DÉBOGAGE et données dynamiques simples) ---
    function setupDashboardChart(chartData) {
        const ctx = document.getElementById('demandsChart');
        if (!ctx) {
            console.warn("Canvas du graphique 'demandsChart' non trouvé. Le graphique ne sera pas affiché.");
            return;
        }
        console.log("Canvas 'demandsChart' trouvé. Tentative d'initialisation/mise à jour du graphique...");

        if (demandsChartInstance) {
            console.log("Destruction de l'instance précédente du graphique.");
            demandsChartInstance.destroy();
        }

        if (!chartData || !chartData.labels || !chartData.data || chartData.labels.length !== chartData.data.length) {
            console.warn("Données pour le graphique non fournies, incorrectes ou labels/data de longueurs différentes.", chartData);
            const context = ctx.getContext('2d');
            context.clearRect(0, 0, ctx.width, ctx.height);
            context.textAlign = 'center';
            context.fillText('Données non disponibles pour le graphique.', ctx.width / 2, ctx.height / 2);
            return;
        }

        const data = {
            labels: chartData.labels,
            datasets: [{
                label: 'Nombre de Demandes',
                data: chartData.data,
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)'
                ],
                borderColor: [
                    'rgb(255, 159, 64)',
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        };
        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: 'Aperçu des Statuts des Demandes' }
                }
            }
        };
        try {
            console.log("Création d'une nouvelle instance de Chart avec les données:", data);
            demandsChartInstance = new Chart(ctx, config);
            console.log("Graphique Chart.js initialisé/mis à jour avec succès.");
        } catch (e) {
            console.error("Erreur lors de la création/mise à jour du graphique Chart.js:", e);
        }
    }

    // --- NOUVELLE FONCTION pour mettre à jour les widgets ET le graphique ---
    function mettreAJourTableauDeBord(listeDemandes) {
        if (!listeDemandes) {
            console.warn("mettreAJourTableauDeBord: listeDemandes est indéfinie.");
            // Initialiser le graphique avec des données vides ou un message
            if (typeof setupDashboardChart === "function") {
                 setupDashboardChart({ labels: ['Aucune Donnée'], data: [0] });
            }
            return;
        }

        let enCoursCount = 0;
        let approuveesCount = 0;
        let rejeteesCount = 0;
        let enAttenteSpecificCount = 0;

        listeDemandes.forEach(demande => {
            const statut = demande.statut;
            if (statut === 'EN_ATTENTE') {
                enAttenteSpecificCount++;
                enCoursCount++;
            } else if (statut === 'APPROUVEE') {
                approuveesCount++;
            } else if (statut === 'REJETEE' || statut === 'REJETEE_SUCCURSALE') {
                rejeteesCount++;
            } else if (statut !== 'TERMINEE' && statut !== 'ANNULEE') {
                enCoursCount++;
            }
        });

        console.log("Statistiques calculées:", { enAttenteSpecificCount, approuveesCount, rejeteesCount, enCoursCount });

        const demandesEnCoursWidgetP = document.querySelector('#dashboard .stats-widgets-grid .widget:nth-child(1) .widget-content p');
        const demandesApprouveesWidgetP = document.querySelector('#dashboard .stats-widgets-grid .widget:nth-child(2) .widget-content p');
        const demandesRejeteesWidgetP = document.querySelector('#dashboard .stats-widgets-grid .widget:nth-child(3) .widget-content p');
        const enAttenteWidgetP = document.querySelector('#dashboard .stats-widgets-grid .widget:nth-child(4) .widget-content p');

        if (demandesEnCoursWidgetP) demandesEnCoursWidgetP.textContent = enCoursCount;
        if (demandesApprouveesWidgetP) demandesApprouveesWidgetP.textContent = approuveesCount;
        if (demandesRejeteesWidgetP) demandesRejeteesWidgetP.textContent = rejeteesCount;
        if (enAttenteWidgetP) enAttenteWidgetP.textContent = enAttenteSpecificCount;

        if (typeof setupDashboardChart === "function") {
            setupDashboardChart({
                labels: ['En Attente (spéc.)', 'Approuvées', 'Rejetées', 'En Cours (total)'],
                data: [enAttenteSpecificCount, approuveesCount, rejeteesCount, enCoursCount]
            });
        }
    }


    // --- Gestion du formulaire de demande (CRÉATION ET MISE À JOUR) ---
    function setupRequestForm() {
        if (!requestForm || !requestFormTitleElement || !demandeIdHiddenInput) {
            console.error("Éléments clés du formulaire (requestForm, requestFormTitleElement, ou demandeIdHiddenInput) manquants.");
            return;
        }
        const addItemBtn = requestForm.querySelector('.add-item-btn');
        const itemsContainer = requestForm.querySelector('.items-container');
        const fileUpload = requestForm.querySelector('#fileUpload');
        const fileListDisplay = requestForm.querySelector('.file-list');

        if (addItemBtn) addItemBtn.addEventListener('click', () => { /* ... code ajouter article ... */ });
        if (itemsContainer) itemsContainer.addEventListener('click', (e) => { /* ... code supprimer article ... */ });
        if (fileUpload) fileUpload.addEventListener('change', (e) => { /* ... code afficher fichiers ... */ });

        requestForm.addEventListener('submit', async function(event) { /* ... (logique de soumission inchangée) ... */ });
    }

    // --- Initialisation ---
    function init() {
        // !!! IMPORTANT: Définir l'ID de l'utilisateur connecté !!!
        utilisateurIdConnecte = 1; // <<<< VÉRIFIEZ ET MODIFIEZ CET ID ATTENTIVEMENT

        if (typeof setupNavigation === "function") setupNavigation();
        if (typeof setupTableFilter === "function") setupTableFilter();
        if (typeof setupHistoryFilter === "function") setupHistoryFilter();
        if (typeof setupModals === "function") setupModals();
        if (typeof setupNotifications === "function") setupNotifications();
        // setupDashboardChart est appelé par mettreAJourTableauDeBord après le chargement des données
        if (typeof setupRequestForm === "function") setupRequestForm();

        if(typeof chargerEtAfficherDemandesUtilisateur === "function") {
            chargerEtAfficherDemandesUtilisateur(utilisateurIdConnecte);
        }
        if (typeof setupDemandActions === "function") setupDemandActions();
    }

    // Démarrer l'application
    init();
});