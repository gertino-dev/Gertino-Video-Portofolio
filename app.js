/**
 * Video Portfolio App - Public Page
 */

let allVideos = [];
let currentFilters = {
    search: '',
    category: 'all',
    tag: null,
    featured: false,
    sort: 'newest'
};

let elements = {};

// --- Data Loading ---

async function loadVideos() {
    try {
        // Try to fetch from JSON with cache busting
        const response = await fetch(`./videos.json?v=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error('Fetch failed');
        allVideos = await response.json();
    } catch (error) {
        console.warn('Could not fetch videos.json, using fallback.', error);
        const fallback = document.getElementById('videos-fallback');
        if (fallback) {
            allVideos = JSON.parse(fallback.textContent);
        }
    }
    
    // Check localStorage for any local overrides (from admin)
    const localVideos = localStorage.getItem('portfolio_videos_v1');
    if (localVideos) {
        // Prioritize local storage so the user sees their changes immediately
        allVideos = JSON.parse(localVideos);
    }

    if (allVideos.length > 0) {
        renderCategories();
        renderTags();
        applyFilters();
    } else {
        renderGrid([]); // Show empty state
    }
}

// --- Initialization ---

function initApp() {
    // Select elements
    elements = {
        videoGrid: document.getElementById('video-grid'),
        searchInput: document.getElementById('search-input'),
        sortSelect: document.getElementById('sort-select'),
        categoriesList: document.getElementById('categories-list'),
        tagsChips: document.getElementById('tags-chips'),
        emptyState: document.getElementById('empty-state'),
        resetFiltersBtn: document.getElementById('reset-filters'),
        modal: document.getElementById('video-modal'),
        modalClose: document.querySelector('.modal-close'),
        youtubePlayer: document.getElementById('youtube-player'),
        modalTitle: document.getElementById('modal-title'),
        modalClient: document.getElementById('modal-client'),
        modalCategory: document.getElementById('modal-category'),
        modalDate: document.getElementById('modal-date'),
        modalDescription: document.getElementById('modal-description'),
        modalTags: document.getElementById('modal-tags'),
        navItems: document.querySelectorAll('.nav-item')
    };

    setupEventListeners();
}

let isInitialized = false;

window.addEventListener('pageshow', (event) => {
    if (!isInitialized) {
        initApp();
        isInitialized = true;
    }
    loadVideos();
});

// Sync if storage changes in another tab
window.addEventListener('storage', (event) => {
    if (event.key === 'portfolio_videos_v1') {
        loadVideos();
    }
});

function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
    });

    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        applyFilters();
    });

    // Sidebar Nav (All / Best of)
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const filter = item.dataset.filter;
            currentFilters.featured = (filter === 'featured');
            applyFilters();
        });
    });

    // Reset
    elements.resetFiltersBtn.addEventListener('click', resetFilters);

    // Modal Close
    elements.modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.querySelector('.modal-backdrop')) closeModal();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// --- Filtering & Sorting ---

function applyFilters() {
    let filtered = [...allVideos];

    // Search
    if (currentFilters.search) {
        filtered = filtered.filter(v => 
            v.title.toLowerCase().includes(currentFilters.search) ||
            v.client.toLowerCase().includes(currentFilters.search) ||
            v.category.toLowerCase().includes(currentFilters.search) ||
            v.description.toLowerCase().includes(currentFilters.search) ||
            v.tags.some(t => t.toLowerCase().includes(currentFilters.search))
        );
    }

    // Category
    if (currentFilters.category !== 'all') {
        filtered = filtered.filter(v => v.category === currentFilters.category);
    }

    // Tag
    if (currentFilters.tag) {
        filtered = filtered.filter(v => v.tags.includes(currentFilters.tag));
    }

    // Featured
    if (currentFilters.featured) {
        filtered = filtered.filter(v => v.featured);
    }

    // Sort
    filtered.sort((a, b) => {
        if (currentFilters.sort === 'newest') return new Date(b.date) - new Date(a.date);
        if (currentFilters.sort === 'oldest') return new Date(a.date) - new Date(b.date);
        if (currentFilters.sort === 'title-asc') return a.title.localeCompare(b.title);
        if (currentFilters.sort === 'title-desc') return b.title.localeCompare(a.title);
        return 0;
    });

    renderGrid(filtered);
}

function resetFilters() {
    currentFilters = {
        search: '',
        category: 'all',
        tag: null,
        featured: false,
        sort: 'newest'
    };
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.sortSelect) elements.sortSelect.value = 'newest';
    
    if (elements.navItems && elements.navItems.length > 0) {
        elements.navItems.forEach(i => i.classList.remove('active'));
        elements.navItems[0].classList.add('active');
    }
    
    // Reset active chips
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item-cat').forEach(c => c.classList.remove('active'));

    applyFilters();
}

// --- Rendering ---

function renderGrid(videos) {
    elements.videoGrid.innerHTML = '';
    
    if (videos.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg" alt="${video.title}" loading="lazy" referrerPolicy="no-referrer">
                ${video.featured ? '<span class="featured-badge">Best of</span>' : ''}
            </div>
            <div class="video-info">
                <div class="video-text">
                    <h3>${video.title}</h3>
                    <div class="video-meta-text">${video.client} • ${video.category}</div>
                    <div class="card-tags">
                        ${video.tags.slice(0, 3).map(t => `<span class="card-tag">#${t}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        card.addEventListener('click', () => openModal(video));
        elements.videoGrid.appendChild(card);
    });
}

function renderCategories() {
    const categories = ['all', ...new Set(allVideos.map(v => v.category))];
    elements.categoriesList.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `nav-item nav-item-cat ${currentFilters.category === cat ? 'active' : ''}`;
        btn.innerHTML = `<span>${cat === 'all' ? 'Toutes' : cat}</span>`;
        btn.onclick = () => {
            document.querySelectorAll('.nav-item-cat').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.category = cat;
            applyFilters();
        };
        elements.categoriesList.appendChild(btn);
    });
}

function renderTags() {
    const tags = [...new Set(allVideos.flatMap(v => v.tags))];
    elements.tagsChips.innerHTML = '';
    
    tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = `chip ${currentFilters.tag === tag ? 'active' : ''}`;
        chip.textContent = tag;
        chip.onclick = () => {
            if (currentFilters.tag === tag) {
                currentFilters.tag = null;
                chip.classList.remove('active');
            } else {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                currentFilters.tag = tag;
                chip.classList.add('active');
            }
            applyFilters();
        };
        elements.tagsChips.appendChild(chip);
    });
}

// --- Modal Logic ---

function extractYoutubeId(url) {
    if (!url) return '';
    // Support for standard URLs, Shorts, and mobile links
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

function openModal(video) {
    const videoId = extractYoutubeId(video.youtubeId);
    const origin = window.location.origin;
    elements.youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&origin=${origin}`;
    elements.modalTitle.textContent = video.title;
    elements.modalClient.textContent = video.client;
    elements.modalCategory.textContent = video.category;
    elements.modalDate.textContent = new Date(video.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    elements.modalDescription.textContent = video.description;
    
    elements.modalTags.innerHTML = video.tags.map(t => `<span class="chip">#${t}</span>`).join('');
    
    elements.modal.classList.remove('hidden');
    elements.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.classList.add('hidden');
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.youtubePlayer.src = '';
    document.body.style.overflow = '';
}

// Start
// initApp is now called via pageshow event
