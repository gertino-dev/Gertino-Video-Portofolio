/**
 * Video Portfolio App - Admin Panel Logic
 */

const STORAGE_KEY = 'portfolio_videos_v1';
let videos = [];
let editingId = null;

const elements = {
    form: document.getElementById('video-form'),
    formTitle: document.getElementById('form-title'),
    idInput: document.getElementById('video-id'),
    titleInput: document.getElementById('title'),
    youtubeIdInput: document.getElementById('youtubeId'),
    categoryInput: document.getElementById('category'),
    clientInput: document.getElementById('client'),
    tagsInput: document.getElementById('tags'),
    dateInput: document.getElementById('date'),
    featuredInput: document.getElementById('featured'),
    descriptionInput: document.getElementById('description'),
    cancelBtn: document.getElementById('cancel-btn'),
    videoList: document.getElementById('admin-video-list'),
    videoCount: document.getElementById('video-count'),
    exportBtn: document.getElementById('export-btn'),
    clearBtn: document.getElementById('clear-btn'),
    importFetchBtn: document.getElementById('import-fetch-btn'),
    importFileInput: document.getElementById('import-file'),
    importStatus: document.getElementById('import-status'),
    toast: document.getElementById('toast'),
    loginOverlay: document.getElementById('login-overlay'),
    loginForm: document.getElementById('login-form'),
    passwordInput: document.getElementById('password-input'),
    loginError: document.getElementById('login-error'),
    adminHeader: document.querySelector('.admin-header'),
    adminLayout: document.querySelector('.admin-layout'),
    logoutBtn: document.getElementById('logout-btn')
};

// --- Password Protection ---
const ADMIN_PASSWORD = '123123';

function checkAuth() {
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
        showAdmin();
    }
}

function handleLogin(e) {
    e.preventDefault();
    if (elements.passwordInput.value === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_authenticated', 'true');
        showAdmin();
    } else {
        elements.loginError.classList.remove('hidden');
        elements.passwordInput.value = '';
        elements.passwordInput.focus();
    }
}

function showAdmin() {
    elements.loginOverlay.classList.add('hidden');
    elements.adminHeader.classList.remove('hidden');
    elements.adminLayout.classList.remove('hidden');
}

function handleLogout() {
    sessionStorage.removeItem('admin_authenticated');
    window.location.reload();
}

// --- Initialization ---

async function init() {
    checkAuth();
    await loadFromStorage();
    setupEventListeners();
}

function setupEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.cancelBtn.addEventListener('click', resetForm);
    elements.exportBtn.addEventListener('click', exportJson);
    elements.clearBtn.addEventListener('click', clearAll);
    elements.importFetchBtn.addEventListener('click', importFromUrl);
    elements.importFileInput.addEventListener('change', importFromFile);
}

// --- Data Management ---

async function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        videos = JSON.parse(data);
        renderList();
    } else {
        // Seed from videos.json if empty
        try {
            const response = await fetch(`../videos.json?v=${Date.now()}`);
            if (response.ok) {
                videos = await response.json();
                saveToStorage(); // This calls renderList()
            } else {
                renderList();
            }
        } catch (e) {
            videos = [];
            renderList();
        }
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    renderList();
}

function extractYoutubeId(url) {
    if (!url) return '';
    // Support for standard URLs, Shorts, and mobile links
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

function handleFormSubmit(e) {
    e.preventDefault();

    const videoData = {
        id: editingId || `vid-${Date.now()}`,
        title: elements.titleInput.value,
        youtubeId: extractYoutubeId(elements.youtubeIdInput.value),
        category: elements.categoryInput.value,
        client: elements.clientInput.value,
        tags: elements.tagsInput.value.split(',').map(t => t.trim()).filter(t => t),
        date: elements.dateInput.value,
        featured: elements.featuredInput.checked,
        description: elements.descriptionInput.value
    };

    if (editingId) {
        const index = videos.findIndex(v => v.id === editingId);
        videos[index] = videoData;
        showToast('Vidéo mise à jour !');
    } else {
        videos.unshift(videoData);
        showToast('Vidéo ajoutée !');
    }

    saveToStorage();
    resetForm();
}

function deleteVideo(id) {
    if (confirm('Supprimer cette vidéo ?')) {
        videos = videos.filter(v => v.id !== id);
        saveToStorage();
        showToast('Vidéo supprimée');
    }
}

function editVideo(video) {
    editingId = video.id;
    elements.formTitle.textContent = 'Modifier la vidéo';
    elements.idInput.value = video.id;
    elements.titleInput.value = video.title;
    elements.youtubeIdInput.value = video.youtubeId;
    elements.categoryInput.value = video.category;
    elements.clientInput.value = video.client;
    elements.tagsInput.value = video.tags.join(', ');
    elements.dateInput.value = video.date;
    elements.featuredInput.checked = video.featured;
    elements.descriptionInput.value = video.description;
    
    elements.cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editingId = null;
    elements.formTitle.textContent = 'Ajouter une vidéo';
    elements.form.reset();
    elements.cancelBtn.classList.add('hidden');
}

function clearAll() {
    if (confirm('Voulez-vous vraiment TOUT supprimer ?')) {
        videos = [];
        saveToStorage();
        showToast('Base de données vidée');
    }
}

// --- Import / Export ---

function exportJson() {
    const dataStr = JSON.stringify(videos, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'videos.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Fichier videos.json prêt !');
}

async function importFromUrl() {
    elements.importStatus.textContent = 'Chargement...';
    try {
        const response = await fetch(`../videos.json?v=${Date.now()}`);
        if (!response.ok) throw new Error('Fichier non trouvé ou inaccessible');
        const data = await response.json();
        
        if (confirm(`Importer ${data.length} vidéos ? Cela écrasera vos données actuelles.`)) {
            videos = data;
            saveToStorage();
            elements.importStatus.textContent = 'Importation réussie !';
            showToast('Données importées depuis le serveur');
        }
    } catch (error) {
        elements.importStatus.textContent = 'Erreur : ' + error.message;
        alert('Impossible de charger videos.json via URL (souvent bloqué en local). Utilisez "Importer un fichier JSON".');
    }
}

function importFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
                if (confirm(`Importer ${data.length} vidéos ?`)) {
                    videos = data;
                    saveToStorage();
                    showToast('Importation réussie');
                }
            } else {
                throw new Error('Format JSON invalide (doit être un tableau)');
            }
        } catch (error) {
            alert('Erreur lors de l\'importation : ' + error.message);
        }
    };
    reader.readAsText(file);
}

// --- Rendering ---

function renderList() {
    elements.videoList.innerHTML = '';
    elements.videoCount.textContent = videos.length;

    videos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'admin-video-item';
        item.innerHTML = `
            <img src="https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg" class="admin-thumb" referrerPolicy="no-referrer">
            <div class="admin-item-info">
                <h4>${video.title}</h4>
                <p>${video.client} | ${video.category} | ${video.date}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-outline btn-edit">Modifier</button>
                <button class="btn btn-danger btn-delete">Supprimer</button>
            </div>
        `;

        item.querySelector('.btn-edit').onclick = () => editVideo(video);
        item.querySelector('.btn-delete').onclick = () => deleteVideo(video.id);

        elements.videoList.appendChild(item);
    });
}

function showToast(msg) {
    elements.toast.textContent = msg;
    elements.toast.classList.remove('hidden');
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

init();
