// Fichier : succursale.js (Version Finale)
document.addEventListener('DOMContentLoaded', function() {
    // --- Sélecteurs ---
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const mainSections = document.querySelectorAll('.main-content section');
    const demandsTableBody = document.querySelector('#demandes-en-attente tbody');
    const historyTableBody = document.querySelector('#historique tbody');

    // Sélecteurs pour les modals
    const returnModal = document.getElementById('returnModal');
    const returnForm = document.getElementById('returnForm');
    const returnSubmitBtn = document.querySelector('.return-submit');

    // --- Fonctions Principales ---
    async function chargerToutesLesDemandes() {
        try {
            const response = await fetch('/api/demandes');
            if (!response.ok && response.status !== 404) throw new Error(`Erreur ${response.status}`);
            const demandes = response.status === 404 ? [] : await response.json();

            // Filtrer les demandes côté client
            const demandesEnAttente = demandes.filter(d => d.statut === 'EN_ATTENTE');
            const demandesHistorique = demandes.filter(d => d.statut === 'APPROUVEE' || d.statut === 'REJETEE' || d.statut === 'RETOURNEE');

            afficherDemandesEnAttente(demandesEnAttente);
            afficherHistorique(demandesHistorique);
        } catch (error) {
            console.error('Erreur lors du chargement des demandes:', error);
        }
    }

    function afficherDemandesEnAttente(listeDemandes) {
        if (!demandsTableBody) return;
        demandsTableBody.innerHTML = '';
        if (listeDemandes.length === 0) {
            demandsTableBody.innerHTML = '<tr><td colspan="5">Aucune demande en attente.</td></tr>';
            return;
        }

        listeDemandes.forEach(demande => {
            const tr = document.createElement('tr');
            tr.dataset.id = demande.id;

            const demandeur = demande.utilisateur ? demande.utilisateur.username : 'N/A';
            const dateFormatee = new Date(demande.dateCreation).toLocaleDateString('fr-FR');

            tr.innerHTML = `
                <td>DEM-${String(demande.id).padStart(5, '0')}</td>
                <td>${demandeur}</td>
                <td>${demande.commentaire || 'Pas de commentaire'}</td>
                <td>${dateFormatee}</td>
                <td>
                    <button class="action-button view-details-button" title="Voir les détails"><i class="fas fa-eye"></i></button>
                    <button class="action-button approve-button" title="Approuver"><i class="fas fa-check"></i></button>
                    <button class="action-button reject-button" title="Rejeter"><i class="fas fa-times"></i></button>
                    <button class="action-button return-button" title="Retourner"><i class="fas fa-undo"></i></button>
                </td>
            `;
            demandsTableBody.appendChild(tr);
        });
    }

    function afficherHistorique(listeDemandes) {
        if (!historyTableBody) return;
        historyTableBody.innerHTML = '';
        if (listeDemandes.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="6">Aucun historique à afficher.</td></tr>';
            return;
        }
        listeDemandes.forEach(demande => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>DEM-${String(demande.id).padStart(5, '0')}</td>
                <td>${demande.utilisateur.username}</td>
                <td>${demande.commentaire}</td>
                <td>${new Date(demande.dateCreation).toLocaleDateString('fr-FR')}</td>
                <td>${getStatusHTML(demande.statut)}</td>
                <td><button class="action-button view-details-button" title="Voir les détails"><i class="fas fa-eye"></i></button></td>
            `;
            historyTableBody.appendChild(tr);
        });
    }

    // Fonction de statut mise à jour pour inclure RETOURNEE
    function getStatusHTML(statusKeyJava) {
        const statusMap = {
            'EN_ATTENTE': { text: 'En attente', class: 'status-pending', icon: 'clock' },
            'APPROUVEE': { text: 'Approuvée', class: 'status-approved', icon: 'check-circle' },
            'REJETEE': { text: 'Rejetée', class: 'status-rejected', icon: 'times-circle' },
            'RETOURNEE': { text: 'Retournée', class: 'status-returned', icon: 'undo' },
            'ANNULEE': { text: 'Annulée', class: 'status-rejected', icon: 'ban' }
        };
        const config = statusMap[statusKeyJava] || { text: statusKeyJava, class: 'status-unknown', icon: 'question-circle' };
        return `<span class="status ${config.class}"><i class="fas fa-${config.icon}"></i> ${config.text}</span>`;
    }

    // Gestion des actions (Approuver / Rejeter / RETOURNER)
    function setupActions() {
        demandsTableBody.addEventListener('click', function(e) {
            const button = e.target.closest('.action-button');
            if (!button) return;

            const row = button.closest('tr');
            const demandeId = row.dataset.id;
            const ref = `DEM-${String(demandeId).padStart(5, '0')}`;

            if (button.classList.contains('approve-button')) {
                if (confirm(`Voulez-vous vraiment APPROUVER la demande ${ref} ?`)) {
                    handleSimpleAction(demandeId, 'approuver');
                }
            } else if (button.classList.contains('reject-button')) {
                if (confirm(`Voulez-vous vraiment REJETER la demande ${ref} ?`)) {
                    handleSimpleAction(demandeId, 'rejeter');
                }
            } else if (button.classList.contains('return-button')) {
                // Ouvre le modal de retour
                returnForm.dataset.demandeId = demandeId; // Stocke l'ID sur le formulaire
                returnModal.style.display = 'block';
            }
        });
    }

    // Gère les actions simples (sans commentaire)
    async function handleSimpleAction(demandeId, action) {
        try {
            const response = await fetch(`/api/demandes/${demandeId}/${action}`, { method: 'PUT' });
            if (!response.ok) throw new Error(await response.text());

            alert(`La demande a été ${action === 'approuver' ? 'approuvée' : 'rejetée'} avec succès.`);
            chargerToutesLesDemandes();
        } catch (error) {
            console.error(`Erreur lors de l'action '${action}':`, error);
            alert(`Une erreur est survenue : ${error.message}`);
        }
    }

    // Gère la soumission du formulaire du modal de retour
    returnForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const demandeId = returnForm.dataset.demandeId;
        const commentaireTextarea = returnForm.querySelector('textarea[name="comments"]');
        const commentaire = commentaireTextarea.value.trim();

        if (!commentaire) {
            alert('Veuillez fournir un commentaire pour retourner la demande.');
            return;
        }

        try {
            const response = await fetch(`/api/demandes/${demandeId}/retourner`, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: commentaire
            });

            if (!response.ok) throw new Error(await response.text());

            alert('La demande a été retournée avec succès.');
            returnModal.style.display = 'none'; // Ferme le modal
            commentaireTextarea.value = ''; // Vide le textarea
            chargerToutesLesDemandes(); // Met à jour les tableaux
        } catch (error) {
            console.error('Erreur lors du retour de la demande:', error);
            alert(`Une erreur est survenue : ${error.message}`);
        }
    });


    // --- Initialisation de la page ---
    function init() {
        // Navigation
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                mainSections.forEach(s => s.style.display = 'none');
                document.getElementById(targetId).style.display = 'block';
                sidebarLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Fermeture des modals
        document.querySelectorAll('.close-modal, .cancel-button').forEach(button => {
            button.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        document.querySelector('.sidebar a[href="#demandes-en-attente"]').click();
        chargerToutesLesDemandes();
        setupActions();
    }

    init();
});