document.addEventListener('DOMContentLoaded', function() {
    // --- Variables globales ---
    let utilisateurIdConnecte = null;
    let utilisateurRole = null;

    // --- Sélecteurs ---
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const mainSections = document.querySelectorAll('.main-content section');
    const demandsTableBody = document.querySelector('#demandes-en-attente tbody');
    const historyTableBody = document.querySelector('#historique tbody');
    const filterInput = document.querySelector('.filter-input');
    const statusFilter = document.querySelector('.status-filter');
    const dateFilter = document.querySelector('.date-filter');
    const agenceFilter = document.querySelector('.agence-filter');
    const notificationList = document.querySelector('.notification-list-styled');
    const notificationBell = document.querySelector('.notification-bell');
    const notificationBadge = document.querySelector('.notification-badge');
    const currentYearSpan = document.getElementById('currentYear');

    // Modals
    const demandDetailsModal = document.getElementById('demandDetailsModal');
    const approveModal = document.getElementById('approveModal');
    const rejectModal = document.getElementById('rejectModal');
    const returnModal = document.getElementById('returnModal');

    let demandsChartInstance = null;

    // --- Authentification ---
    async function verifierAuthentification() {
        try {
            const response = await fetch('/api/auth/current-user');
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            const userData = await response.json();

            // Vérifier si l'utilisateur a le rôle ROLE_RESPONSABLE_SUCCURSALE
            if (userData.role && userData.role.nom === 'ROLE_RESPONSABLE_SUCCURSALE') {
                utilisateurIdConnecte = userData.id;
                utilisateurRole = userData.role.nom;
                document.querySelector('.user-info .user-name').textContent = `${userData.prenom} ${userData.nom}`;
                document.querySelector('.user-info .user-role').textContent = 'Responsable Succursale';
                return true;
            } else {
                alert('Accès non autorisé. Vous devez être responsable succursale pour accéder à cette interface.');
                window.location.href = '/login.html';
                return false;
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
            alert('Erreur lors de la vérification de l\'authentification. Veuillez vous reconnecter.');
            window.location.href = '/login.html';
            return false;
        }
    }

    // --- Fonctions de chargement des données ---
    async function chargerDemandes() {
        if (!utilisateurIdConnecte) {
            console.error('Utilisateur non authentifié');
            return;
        }

        try {
            const response = await fetch('/api/demandes/succursale', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            const demandes = await response.json();

            // Mise à jour du tableau de bord
            mettreAJourTableauDeBord(demandes);

            // Séparation des demandes en cours et historique
            const demandesEnCours = demandes.filter(d =>
                d.statut === 'EN_ATTENTE' ||
                d.statut === 'EN_COURS_VALIDATION_SUCCURSALE'
            );
            const demandesHistorique = demandes.filter(d =>
                d.statut === 'VALIDEE_SUCCURSALE' ||
                d.statut === 'REJETEE_SUCCURSALE' ||
                d.statut === 'RETOURNEE_SUCCURSALE'
            );

            // Affichage dans les tableaux
            afficherDemandesDansTableau(demandesEnCours, demandsTableBody, "demandesEnCours");
            afficherDemandesDansTableau(demandesHistorique, historyTableBody, "historique");
        } catch (error) {
            console.error('Erreur lors du chargement des demandes:', error);
            alert('Erreur lors du chargement des demandes. Veuillez réessayer.');
        }
    }

    // --- Fonctions de gestion des demandes ---
    async function approuverDemande(demandeId, commentaire) {
        if (!utilisateurIdConnecte) {
            alert('Vous devez être connecté pour effectuer cette action.');
            return;
        }

        try {
            const response = await fetch(`/api/demandes/${demandeId}/approuver`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    commentaire,
                    utilisateurId: utilisateurIdConnecte
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            // Recharger les demandes
            await chargerDemandes();
            alert('Demande approuvée avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'approbation:', error);
            alert('Erreur lors de l\'approbation de la demande. Veuillez réessayer.');
        }
    }

    async function rejeterDemande(demandeId, motif) {
        if (!utilisateurIdConnecte) {
            alert('Vous devez être connecté pour effectuer cette action.');
            return;
        }

        try {
            const response = await fetch(`/api/demandes/${demandeId}/rejeter`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    motif,
                    utilisateurId: utilisateurIdConnecte
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            // Recharger les demandes
            await chargerDemandes();
            alert('Demande rejetée avec succès !');
        } catch (error) {
            console.error('Erreur lors du rejet:', error);
            alert('Erreur lors du rejet de la demande. Veuillez réessayer.');
        }
    }

    async function retournerDemande(demandeId, commentaire) {
        if (!utilisateurIdConnecte) {
            alert('Vous devez être connecté pour effectuer cette action.');
            return;
        }

        try {
            const response = await fetch(`/api/demandes/${demandeId}/retourner`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    commentaire,
                    utilisateurId: utilisateurIdConnecte
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            // Recharger les demandes
            await chargerDemandes();
            alert('Demande retournée avec succès !');
        } catch (error) {
            console.error('Erreur lors du retour:', error);
            alert('Erreur lors du retour de la demande. Veuillez réessayer.');
        }
    }

    // --- Fonctions d'affichage ---
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
                <td>${demande.agence?.nom || 'N/A'}</td>
                <td>${description.substring(0, 70)}${description.length > 70 ? '...' : ''}</td>
                <td>${dateFormatee}</td>
                <td>${getStatusHTML(demande.statut)}</td>
                <td>
                    <button class="action-button view-details-button" title="Voir les détails"><i class="fas fa-eye"></i></button>
                    ${demande.statut === 'EN_ATTENTE' ? `
                    <button class="action-button approve-button" title="Approuver"><i class="fas fa-check"></i></button>
                    <button class="action-button reject-button" title="Rejeter"><i class="fas fa-times"></i></button>
                    <button class="action-button return-button" title="Retourner"><i class="fas fa-undo"></i></button>
                    ` : ''}
                </td>
            `;
            tbodyElement.appendChild(tr);
        });
    }

    function mettreAJourTableauDeBord(demandes) {
        // Mise à jour des widgets
        const stats = {
            enAttente: demandes.filter(d => d.statut === 'EN_ATTENTE').length,
            approuvees: demandes.filter(d => d.statut === 'VALIDEE_SUCCURSALE').length,
            rejetees: demandes.filter(d => d.statut === 'REJETEE_SUCCURSALE').length,
            retournees: demandes.filter(d => d.statut === 'RETOURNEE_SUCCURSALE').length
        };

        // Mise à jour des compteurs
        document.querySelector('.widget:nth-child(1) .widget-content p').textContent = stats.enAttente;
        document.querySelector('.widget:nth-child(2) .widget-content p').textContent = stats.approuvees;
        document.querySelector('.widget:nth-child(3) .widget-content p').textContent = stats.rejetees;
        document.querySelector('.widget:nth-child(4) .widget-content p').textContent = stats.retournees;

        // Mise à jour du graphique
        updateDashboardChart(stats);
    }

    // --- Navigation ---
    function setupNavigation() {
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                mainSections.forEach(section => section.style.display = 'none');
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
                sidebarLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Activer la vue par défaut (tableau de bord)
        const defaultLink = document.querySelector('.sidebar a[href="#dashboard"]');
        if (defaultLink) {
            defaultLink.click();
        }
    }

    // --- Filtrage des demandes ---
    function setupTableFilter() {
        if (!filterInput || !demandsTableBody) return;

        function filterDemands() {
            const searchText = filterInput.value.toLowerCase();
            const agenceValue = agenceFilter.value;
            const dateValue = dateFilter.value;

            const rows = demandsTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const description = row.cells[2].textContent.toLowerCase();
                const agence = row.cells[1].textContent;
                const date = row.cells[3].textContent;

                const matchesSearch = description.includes(searchText);
                const matchesAgence = !agenceValue || agence === agenceValue;
                const matchesDate = !dateValue || date === dateValue;

                row.style.display = matchesSearch && matchesAgence && matchesDate ? '' : 'none';
            });
        }

        filterInput.addEventListener('input', filterDemands);
        if (agenceFilter) agenceFilter.addEventListener('change', filterDemands);
        if (dateFilter) dateFilter.addEventListener('change', filterDemands);
    }

    // --- Filtrage de l'historique ---
    function setupHistoryFilter() {
        if (!statusFilter || !historyTableBody) return;

        function filterHistory() {
            const searchText = filterInput.value.toLowerCase();
            const statusValue = statusFilter.value;
            const dateValue = dateFilter.value;

            const rows = historyTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const description = row.cells[2].textContent.toLowerCase();
                const status = row.querySelector('.status').classList[1].replace('status-', '');
                const date = row.cells[3].textContent;

                const matchesSearch = description.includes(searchText);
                const matchesStatus = !statusValue || status === statusValue;
                const matchesDate = !dateValue || date === dateValue;

                row.style.display = matchesSearch && matchesStatus && matchesDate ? '' : 'none';
            });
        }

        if (filterInput) filterInput.addEventListener('input', filterHistory);
        statusFilter.addEventListener('change', filterHistory);
        if (dateFilter) dateFilter.addEventListener('change', filterHistory);
    }

    // --- Affichage des détails de la demande ---
    async function showDemandDetails(demandeId) {
        try {
            const response = await fetch(`/api/demandes/${demandeId}`);
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            const demande = await response.json();

            // Mise à jour des informations de base
            document.getElementById('modalDemandId').textContent = `DEM-${String(demande.id).padStart(5, '0')}`;
            document.getElementById('modalDemandAgency').textContent = demande.agence?.nom || 'N/A';
            document.getElementById('modalDemandTitle').textContent = demande.titre || 'Sans titre';
            document.getElementById('modalDemandDescription').textContent = demande.commentaire || 'Pas de description';

            // Formatage de la date
            let dateFormatee = 'N/A';
            if (demande.dateCreation) {
                try {
                    const dateObj = new Date(demande.dateCreation);
                    if (!isNaN(dateObj.getTime())) {
                        dateFormatee = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                    }
                } catch (e) {
                    dateFormatee = demande.dateCreation;
                }
            }
            document.getElementById('modalDemandDate').textContent = dateFormatee;
            document.getElementById('modalDemandStatus').innerHTML = getStatusHTML(demande.statut);

            // Remplir la table des articles
            const itemsTableBody = document.getElementById('modalDemandItems');
            itemsTableBody.innerHTML = '';
            if (demande.articles && demande.articles.length > 0) {
                demande.articles.forEach(article => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${article.nom}</td>
                        <td>${article.quantite}</td>
                        <td>${article.specifications || '-'}</td>
                    `;
                    itemsTableBody.appendChild(row);
                });
            } else {
                itemsTableBody.innerHTML = '<tr><td colspan="3">Aucun article dans cette demande.</td></tr>';
            }

            // Remplir la liste des fichiers
            const filesList = document.getElementById('modalDemandFiles');
            filesList.innerHTML = '';
            if (demande.fichiers && demande.fichiers.length > 0) {
                demande.fichiers.forEach(fichier => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${fichier.nom}</span>
                        <button class="action-button" title="Télécharger" onclick="telechargerFichier('${fichier.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                    `;
                    filesList.appendChild(li);
                });
            } else {
                filesList.innerHTML = '<li>Aucun fichier joint.</li>';
            }

            // Afficher le modal
            demandDetailsModal.style.display = 'block';
        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
            alert('Erreur lors du chargement des détails de la demande. Veuillez réessayer.');
        }
    }

    // --- Téléchargement des fichiers ---
    async function telechargerFichier(fichierId) {
        try {
            const response = await fetch(`/api/fichiers/${fichierId}/telecharger`);
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            // Récupérer le nom du fichier depuis les headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'fichier';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            // Créer un blob et télécharger le fichier
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
            alert('Erreur lors du téléchargement du fichier. Veuillez réessayer.');
        }
    }

    // --- Gestion des actions sur les demandes ---
    function setupDemandActions() {
        if (!demandsTableBody) return;

        demandsTableBody.addEventListener('click', function(e) {
            const button = e.target.closest('.action-button');
            if (!button) return;

            const row = button.closest('tr');
            const demandId = row.dataset.id;

            if (button.classList.contains('view-details-button')) {
                showDemandDetails(demandId);
            } else if (button.classList.contains('approve-button')) {
                showApproveModal(demandId);
            } else if (button.classList.contains('reject-button')) {
                showRejectModal(demandId);
            } else if (button.classList.contains('return-button')) {
                showReturnModal(demandId);
            }
        });
    }

    // --- Gestion des modals ---
    function setupModals() {
        // Fermeture des modals
        document.querySelectorAll('.close-modal, .close-button').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Fermeture en cliquant en dehors
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Gestion des formulaires
        document.getElementById('approveForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const demandeId = this.dataset.demandeId;
            const commentaire = this.querySelector('textarea[name="commentaire"]').value;
            await approuverDemande(demandeId, commentaire);
            approveModal.style.display = 'none';
        });

        document.getElementById('rejectForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const demandeId = this.dataset.demandeId;
            const motif = this.querySelector('textarea[name="motif"]').value;
            await rejeterDemande(demandeId, motif);
            rejectModal.style.display = 'none';
        });

        document.getElementById('returnForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const demandeId = this.dataset.demandeId;
            const commentaire = this.querySelector('textarea[name="commentaire"]').value;
            await retournerDemande(demandeId, commentaire);
            returnModal.style.display = 'none';
        });
    }

    // --- Gestion des notifications ---
    function setupNotifications() {
        if (!notificationList) return;

        // Marquer comme lu
        notificationList.addEventListener('click', function(e) {
            const targetLi = e.target.closest('li.unread');
            if (targetLi && (e.target.closest('.mark-read-btn') || e.target === targetLi)) {
                targetLi.classList.remove('unread');
                updateNotificationCount();
            }
        });

        // Mise à jour du compteur
        function updateNotificationCount() {
            const unreadCount = notificationList.querySelectorAll('li.unread').length;
            if (notificationBadge) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.classList.toggle('show', unreadCount > 0);
            }
        }

        // Mise à jour initiale
        updateNotificationCount();
    }

    // --- Graphique du tableau de bord ---
    function setupDashboardChart() {
        const ctx = document.getElementById('demandsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Demandes approuvées',
                    data: [12, 19, 15, 25, 22, 30],
                    backgroundColor: '#28a745'
                }, {
                    label: 'Demandes rejetées',
                    data: [5, 8, 6, 10, 7, 12],
                    backgroundColor: '#dc3545'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // --- Utilitaires ---
    function getStatusHTML(status) {
        const statusConfig = {
            'EN_ATTENTE': { icon: 'clock', text: 'En attente', class: 'status-pending' },
            'VALIDEE_SUCCURSALE': { icon: 'check-circle', text: 'Approuvée', class: 'status-approved' },
            'REJETEE_SUCCURSALE': { icon: 'times-circle', text: 'Rejetée', class: 'status-rejected' },
            'RETOURNEE_SUCCURSALE': { icon: 'undo', text: 'Retournée', class: 'status-returned' },
            'EN_COURS_VALIDATION_SUCCURSALE': { icon: 'hourglass-half', text: 'En cours de validation', class: 'status-pending' }
        };

        const config = statusConfig[status] || { icon: 'question-circle', text: status, class: 'status-unknown' };
        return `<span class="status ${config.class}"><i class="fas fa-${config.icon}"></i> ${config.text}</span>`;
    }

    // --- Gestion du formulaire de nouvelle demande ---
    function setupNewRequestForm() {
        const requestForm = document.getElementById('requestForm');
        const itemsContainer = document.querySelector('.items-container');
        const addItemBtn = document.querySelector('.add-item-btn');
        const fileUpload = document.getElementById('fileUpload');
        const fileList = document.querySelector('.file-list');
        const cancelBtn = document.querySelector('.form-actions .cancel-button');

        // Créer une nouvelle ligne d'article
        function createItemRow() {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" class="item-name" placeholder="Nom de l'article" required>
                <input type="number" class="item-quantity" placeholder="Qté" min="1" required>
                <input type="text" class="item-specs" placeholder="Spécifications (optionnel)">
                <button type="button" class="remove-item-btn" title="Supprimer"><i class="fas fa-times"></i></button>
            `;
            return row;
        }

        // Ajouter un article
        if (addItemBtn) {
            addItemBtn.addEventListener('click', function() {
                const newRow = createItemRow();
                itemsContainer.appendChild(newRow);
            });
        }

        // Supprimer un article
        if (itemsContainer) {
            itemsContainer.addEventListener('click', function(e) {
                if (e.target.closest('.remove-item-btn')) {
                    const row = e.target.closest('.item-row');
                    if (itemsContainer.children.length > 1) {
                        row.remove();
                    } else {
                        alert('Vous devez avoir au moins un article dans la demande.');
                    }
                }
            });
        }

        // Gestion des fichiers
        if (fileUpload) {
            fileUpload.addEventListener('change', function(e) {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <div class="file-name">
                            <i class="fas fa-file"></i>
                            <span>${file.name}</span>
                        </div>
                        <div class="file-actions">
                            <button type="button" class="remove-file" title="Supprimer"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                    fileList.appendChild(fileItem);
                });
            });
        }

        // Supprimer un fichier
        if (fileList) {
            fileList.addEventListener('click', function(e) {
                if (e.target.closest('.remove-file')) {
                    const fileItem = e.target.closest('.file-item');
                    fileItem.remove();
                }
            });
        }

        // Annuler la demande
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (confirm('Voulez-vous vraiment annuler la création de cette demande ?')) {
                    requestForm.reset();
                    itemsContainer.innerHTML = '';
                    fileList.innerHTML = '';
                    const defaultRow = createItemRow();
                    itemsContainer.appendChild(defaultRow);
                }
            });
        }

        // Soumettre la demande
        if (requestForm) {
            requestForm.addEventListener('submit', function(e) {
                e.preventDefault();

                // Validation des articles
                const items = [];
                const itemRows = itemsContainer.querySelectorAll('.item-row');
                itemRows.forEach(row => {
                    const name = row.querySelector('.item-name').value;
                    const quantity = row.querySelector('.item-quantity').value;
                    const specs = row.querySelector('.item-specs').value;
                    items.push({ name, quantity, specs });
                });

                // Validation des fichiers
                const files = Array.from(fileUpload.files);

                // Préparation des données
                const formData = {
                    title: document.getElementById('requestTitle').value,
                    description: document.getElementById('requestDescription').value,
                    date: document.getElementById('requestDate').value,
                    items: items,
                    files: files
                };

                // TODO: Envoyer les données au serveur
                console.log('Données de la demande:', formData);
                alert('Demande créée avec succès !');

                // Réinitialiser le formulaire
                requestForm.reset();
                itemsContainer.innerHTML = '';
                fileList.innerHTML = '';
                const defaultRow = createItemRow();
                itemsContainer.appendChild(defaultRow);
            });
        }
    }

    // --- Affichage des modals ---
    function showApproveModal(demandeId) {
        const form = document.getElementById('approveForm');
        if (form) {
            form.dataset.demandeId = demandeId;
            approveModal.style.display = 'block';
        }
    }

    function showRejectModal(demandeId) {
        const form = document.getElementById('rejectForm');
        if (form) {
            form.dataset.demandeId = demandeId;
            rejectModal.style.display = 'block';
        }
    }

    function showReturnModal(demandeId) {
        const form = document.getElementById('returnForm');
        if (form) {
            form.dataset.demandeId = demandeId;
            returnModal.style.display = 'block';
        }
    }

    // --- Mise à jour du graphique ---
    function updateDashboardChart(stats) {
        const ctx = document.getElementById('demandsChart');
        if (!ctx) return;

        // Détruire l'instance précédente si elle existe
        if (demandsChartInstance) {
            demandsChartInstance.destroy();
        }

        // Créer une nouvelle instance du graphique
        demandsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['En attente', 'Approuvées', 'Rejetées', 'Retournées'],
                datasets: [{
                    label: 'Nombre de demandes',
                    data: [
                        stats.enAttente,
                        stats.approuvees,
                        stats.rejetees,
                        stats.retournees
                    ],
                    backgroundColor: [
                        '#ffc107', // En attente - Jaune
                        '#28a745', // Approuvées - Vert
                        '#dc3545', // Rejetées - Rouge
                        '#17a2b8'  // Retournées - Bleu
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // --- Initialisation ---
    async function init() {
        // Vérifier l'authentification avant d'initialiser l'interface
        const isAuthenticated = await verifierAuthentification();
        if (!isAuthenticated) return;

        setupNavigation();
        setupTableFilter();
        setupHistoryFilter();
        setupDemandActions();
        setupModals();
        setupNotifications();
        setupDashboardChart();
        setupNewRequestForm();
        chargerDemandes(); // Charger les demandes au démarrage
    }

    // Démarrer l'application
    init();

    // Mise à jour de l'année dans le footer
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});