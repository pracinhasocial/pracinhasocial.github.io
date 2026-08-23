// JavaScript Principal da Pracinha

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG, isSupabaseConfigured } from './config.js';
import { openAvatarCropModal } from './avatar-crop.js';
import { initMusicPlayer, loadUserMusic, loadProfileMusic, initYouTubePlayer, hideYouTubePlayer } from './music-player.js';
import { updateFeedProfileCard, updateCantinhoProfileCard, updatePublicProfileCard, injectProfileCard, updateProfileCard } from '../components/profile-card.js';
import { t } from './translations.js';

// Estado da aplicação
// Remover/ignorar todos os `console.log` para manter o console limpo
if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log = function() {};
}

let currentLanguage = 'pt-BR'; // Forçar português por padrão
let currentTheme = localStorage.getItem('pracinha-theme') || 'light';
let currentUser = null;
let currentProfile = null;
let currentCantinhoProfileId = null;
let isViewingOtherUsersCantinho = false;
let supabase = null;
let checkAuth = null;
let getCurrentUser = null;
let getUserProfile = null;
let getUserStatuses = null;
let getUserStatus = null;
let upsertUserStatus = null;
let deleteUserStatus = null;
let getRecentStatuses = null;
let getStatusReactions = null;
let toggleStatusReaction = null;
let getStatusComments = null;
let addStatusComment = null;
let requestBetaAccess = null;
let createBetaInvite = null;
let getMyBetaInviteCount = null;
let getPinnedAssuntos = null;
let pinAssunto = null;
let unpinAssunto = null;
let deleteExpiredPosts = null;
let scanOrphanedImagesRPC = null;
let deleteImageFromStorage = null;
let getAllTags = null;
let createTag = null;
let votePollOption = null;
let getPollVotes = null;
let editingAssuntoId = null;
let updateTag = null;
let deleteTag = null;
let tagsCache = null;
let currentTagPage = 0;
let tagsPerPage = 10; // 5 por coluna x 2 colunas
let getAllProfiles = null;
let updateUserProfile = null;
let getSiteConfig = null;
let setSiteConfig = null;
let currentLanguageFilter = 'all';
let currentTagFilter = 'all';
let currentContentFilter = 'all';
let currentStatusFilter = 'all';
let feedUpdateChannel = null;
let notificationsChannel = null;
let notificationsPollInterval = null;
const profileCache = new Map();
const REACTION_EMOJIS = ['👍', '❤️', '😄', '🤔'];
const COMPOSER_EMOJIS = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢',
    '😭', '😡', '👍', '👏', '🙏', '❤️', '🔥', '✨',
    '🎉', '💯', '☕', '🎵', '🎮', '📚', '🌅', '🇧🇷'
];
const statusTypeLabels = {
    listening: 'ouvindo',
    eating: 'comendo',
    reading: 'lendo',
    watching: 'assistindo',
    doing: 'fazendo',
    thinking: 'pensando em'
};

// Carregar feed
let mentionCardHideTimeout = null;
let activeMentionAnchor = null;
let emojiPickerTarget = null;
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
let onlineVisitorsInterval = null;
const expandedReplies = new Set();
let selectedAssuntoImageFile = null;
let pendingInviteToken = new URLSearchParams(window.location.search).get('invite') || '';

function stripHtmlAndTruncate(input, max = 280) {
    if (!input) return '';
    const div = document.createElement('div');
    div.innerHTML = input;
    const text = div.textContent || div.innerText || '';
    return text.length <= max ? text : text.slice(0, max);
}

function extractPollDataAndCleanText(content) {
    if (!content) return { cleaned: content, pollData: null };
    const pollMatch = content.match(/<div class="admin-poll"(?:\s+data-poll="true")?>([\s\S]*?)<\/div>/i);
    if (!pollMatch) {
        return { cleaned: content, pollData: null };
    }

    const pollHtml = pollMatch[0];
    const questionMatch = pollHtml.match(/<p>([\s\S]*?)<\/p>/i);
    const optionMatches = [...pollHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)];
    const question = questionMatch ? questionMatch[1].trim() : '';
    const options = optionMatches.map(match => ({ label: match[1].trim(), votes: 0 }));
    const cleaned = content.replace(pollHtml, '').trim();

    if (!question || options.length < 2) {
        return { cleaned: content, pollData: null };
    }

    return {
        cleaned,
        pollData: {
            question,
            options,
            votes: {}
        }
    };
}

// Elementos DOM
const landingScreen = document.getElementById('landing-screen');
const loginScreen = document.getElementById('login-screen');
const signupScreen = document.getElementById('signup-screen');
const mainScreen = document.getElementById('main-screen');
const feedView = document.getElementById('feed-view');
const settingsView = document.getElementById('settings-view');
const cantinhoView = document.getElementById('cantinho-view');
const mainContent = document.getElementById('main-content');

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Injetar header
    const { injectHeader } = await import('../components/header.js');
    await injectHeader('header-container', initHeaderElements);
    
    // Aplicar tema salvo
    applyTheme(currentTheme);

    // Inicializar estado dos botões de idioma
    initLanguageButtons();

    // Service Worker desativado para evitar problemas de cache durante desenvolvimento
    // if ('serviceWorker' in navigator) {
    //     navigator.serviceWorker.register('/sw.js')
    //         .then((registration) => {
    //             console.log('Service Worker registrado com sucesso:', registration);
    //         })
    //         .catch((error) => {
    //             console.log('Falha ao registrar Service Worker:', error);
    //         });
    // }

    // Inicializar PWA install prompt
    initPWAInstall();

    // Inicializar navegação mobile para Cantinho e Perfil Público
    initMobileNavigation();

    // Tentar importar Supabase, mas continuar se falhar
    try {
        const supabaseModule = await import('./supabase-client.js');
        
        supabase = supabaseModule.supabase;
        checkAuth = supabaseModule.checkAuth;
        getCurrentUser = supabaseModule.getCurrentUser;
        getUserProfile = supabaseModule.getUserProfile;
        getUserStatuses = supabaseModule.getUserStatuses;
        getUserStatus = supabaseModule.getUserStatus;
        upsertUserStatus = supabaseModule.upsertUserStatus;
        deleteUserStatus = supabaseModule.deleteUserStatus;
        getRecentStatuses = supabaseModule.getRecentStatuses;
        getStatusReactions = supabaseModule.getStatusReactions;
        toggleStatusReaction = supabaseModule.toggleStatusReaction;
        getStatusComments = supabaseModule.getStatusComments;
        addStatusComment = supabaseModule.addStatusComment;
        requestBetaAccess = supabaseModule.requestBetaAccess;
        createBetaInvite = supabaseModule.createBetaInvite;
        getMyBetaInviteCount = supabaseModule.getMyBetaInviteCount;
        getPinnedAssuntos = supabaseModule.getPinnedAssuntos;
        pinAssunto = supabaseModule.pinAssunto;
        unpinAssunto = supabaseModule.unpinAssunto;
        deleteExpiredPosts = supabaseModule.deleteExpiredPosts;
        votePollOption = supabaseModule.votePollOption;
        getPollVotes = supabaseModule.getPollVotes;
        scanOrphanedImagesRPC = supabaseModule.scanOrphanedImages;
        deleteImageFromStorage = supabaseModule.deleteImageFromStorage;
        getAllTags = supabaseModule.getAllTags;
        createTag = supabaseModule.createTag;
        updateTag = supabaseModule.updateTag;
        deleteTag = supabaseModule.deleteTag;
        getAllProfiles = supabaseModule.getAllProfiles;
        updateUserProfile = supabaseModule.updateUserProfile;
        getSiteConfig = supabaseModule.getSiteConfig;
        setSiteConfig = supabaseModule.setSiteConfig;

        // Expor variáveis globais imediatamente após carregar Supabase
        window.updateUserProfile = updateUserProfile;

        // Carregar tags do banco
        if (getAllTags) {
            try {
                tagsCache = await getAllTags();
                populateTagSelect();
                populateFeedTagFilter();
            } catch (error) {
                console.warn('Não foi possível carregar tags do banco:', error);
            }
        }
    } catch (error) {
        console.warn('Supabase não pôde ser carregado');
        console.error('Erro no import:', error);
    }

    // Verificar se há sessão salva (apenas se Supabase estiver disponível)
    if (checkAuth) {
        const session = await checkAuth();

        if (session) {
            currentUser = await getCurrentUser();
            window.currentUser = currentUser; // Expor globalmente
            if (currentUser) {
                currentProfile = await getUserProfile(currentUser.id);
                window.currentProfile = currentProfile; // Expor globalmente
                if (currentProfile) {
                    // Carregar role do usuário
                    currentUserRole = currentProfile.role || 'user';

                    // Aplicar fontes personalizadas assim que o perfil for carregado
                    applyUserFonts(currentProfile);

                    // Mostrar botão Admin se tiver permissão
                    const adminBtn = document.getElementById('btn-admin');
                    const adminBtnMobile = document.getElementById('btn-admin-mobile');
                    if (adminBtn && hasAdminAccess()) {
                        adminBtn.style.display = 'flex';
                    }
                    if (adminBtnMobile && hasAdminAccess()) {
                        adminBtnMobile.style.display = 'flex';
                        adminBtnMobile.classList.add('visible');
                    }

                    // Mostrar toggle de Aviso do Administrador se for admin
                    const adminAvisoToggle = document.getElementById('admin-aviso-toggle');
                    if (adminAvisoToggle && currentUserRole === 'admin') {
                        adminAvisoToggle.classList.remove('hidden');
                    }

                    loadUserAvatar();
                    showScreen('main');
                    loadUserStatuses(currentUser.id);
                    initNotifications();
                    initOnlineVisitorsTracking();
                    loadAdminAvisos();

                    // Inicializar elementos do header após carregar perfil
                    initHeaderElements();
                    subscribeToFeedUpdates();
                    setupAdminNavigation();
                    initMusicPlayer();
                    // Processar hash da URL após carregar perfil
                    handleHashChange();
                } else {
                    showScreen('landing');
                }
            } else {
                if (supabase) await supabase.auth.signOut();
                showScreen('landing');
            }
        } else {
            showScreen('landing');
        }
    } else {
        showScreen('landing');
    }

    // Configurar roteamento (antes de carregar o feed para respeitar o hash da URL)
    // Só configurar roteamento se o usuário estiver autenticado
    if (currentProfile) {
        setupRouting();
    }

    // Configurar event listeners
    setupEventListeners();

    // Configurar edição inline
    setupInlineEditing();
});

// Mostrar tela específica
function showScreen(screenName) {
    const tempStyle = document.getElementById('temp-loading-style');
    if (tempStyle) tempStyle.remove();

    landingScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    signupScreen.classList.add('hidden');
    mainScreen.classList.add('hidden');

    switch (screenName) {
        case 'landing':
            landingScreen.classList.remove('hidden');
            break;
        case 'login':
            loginScreen.classList.remove('hidden');
            break;
        case 'signup':
            signupScreen.classList.remove('hidden');
            break;
        case 'main':
            mainScreen.classList.remove('hidden');
            // Não chamar showFeedView aqui - deixar handleHashChange decidir
            break;
    }

    updateLanguageUI();
    updateScrollTopVisibility();
}

// Função pour atualizar a navegação do header baseado na página atual
function updateHeaderNavigation() {
    // Remover classe active de todos os itens de navegação
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Verificar qual view está ativa
    const feedView = document.getElementById('feed-view');
    const cantinhoView = document.getElementById('cantinho-view');
    const publicProfileView = document.getElementById('public-profile-view');
    const settingsView = document.getElementById('settings-view');
    const adminView = document.getElementById('admin-view');

    // Se estiver no feed principal
    if (!feedView.classList.contains('hidden')) {
        const navItemPracinha = document.getElementById('nav-item-pracinha');
        if (navItemPracinha) navItemPracinha.classList.add('active');
    }
    // Se estiver no perfil público (cantinho de alguém) - verificar PRIMEIRO
    else if (!publicProfileView.classList.contains('hidden')) {
        const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
        if (navItemCantinhoDono) navItemCantinhoDono.classList.add('active');
    }
    // Se estiver no cantinho de outra pessoa (via goToProfile)
    else if (!cantinhoView.classList.contains('hidden') && isViewingOtherUsersCantinho) {
        const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
        if (navItemCantinhoDono) navItemCantinhoDono.classList.add('active');
    }
    // Se estiver no cantinho (próprio cantinho)
    else if (!cantinhoView.classList.contains('hidden')) {
        const navItemMeuCantinho = document.getElementById('nav-item-meu-cantinho');
        if (navItemMeuCantinho) navItemMeuCantinho.classList.add('active');
    }
    // Se estiver em páginas que não estão no header (settings, admin, etc.)
    // Todos os itens ficam sem classe active (já removidos acima)
}

function showFeedView() {
    if (!feedView || !settingsView || !mainContent) return;
    // Não mudar o hash aqui - deixar o routing controlar
    feedView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    if (cantinhoView) cantinhoView.classList.add('hidden');
    const publicProfileView = document.getElementById('public-profile-view');
    if (publicProfileView) publicProfileView.classList.add('hidden');
    const adminView = document.getElementById('admin-view');
    if (adminView) adminView.classList.add('hidden');
    const pageView = document.getElementById('page-view');
    if (pageView) pageView.classList.add('hidden');
    mainContent.classList.remove('settings-mode');
    mainContent.style.padding = '';
    if (mainScreen) mainScreen.classList.remove('settings-mode');

    // Restaurar background do usuário logado
    if (currentProfile) {
        applyBackground(currentProfile);
    }

    // Carregar player de música no sidebar direito
    if (currentProfile && currentProfile.soundcloud_url) {
        loadProfileMusic(currentProfile, 'music-player-card');
    }

    // Recarregar fotos do usuário ao voltar para o feed
    if (currentUser) {
        loadUserPhotos(currentUser.id);
    }

    // Atualizar navegação do header
    updateHeaderNavigation();

    // Esconder botão de apelido do cantinho
    const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
    if (navItemCantinhoDono) {
        navItemCantinhoDono.classList.add('hidden');
    }

    window.scrollTo(0, 0);
    updateScrollTopVisibility();
    if (currentUser) {
        loadUserStatuses(currentUser.id).catch(error => {
            console.warn('Não foi possível atualizar os status do usuário ao mostrar o feed:', error);
        });
    }

    // Garantir que a URL reflita o feed (ajuda em mobile quando handlers não atualizam a hash)
    try {
        if (window.location.hash !== '#/feed') {
            window.location.hash = '#/feed';
        }
    } catch (err) {
        console.warn('Erro ao atualizar hash para #/feed', err);
    }
}

function showSettingsView() {
    if (!feedView || !settingsView || !mainContent) return;
    window.location.hash = '#/settings';
    feedView.classList.add('hidden');
    settingsView.classList.remove('hidden');
    if (cantinhoView) cantinhoView.classList.add('hidden');
    const publicProfileView = document.getElementById('public-profile-view');
    if (publicProfileView) publicProfileView.classList.add('hidden');
    const adminView = document.getElementById('admin-view');
    if (adminView) adminView.classList.add('hidden');
    const pageView = document.getElementById('page-view');
    if (pageView) pageView.classList.add('hidden');
    mainContent.classList.add('settings-mode');
    mainContent.style.padding = '';
    if (mainScreen) mainScreen.classList.add('settings-mode');

    // Restaurar background do usuário logado
    if (currentProfile) {
        applyBackground(currentProfile);
    }

    // Atualizar navegação do header
    updateHeaderNavigation();

    // Esconder botão de apelido do cantinho
    const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
    if (navItemCantinhoDono) {
        navItemCantinhoDono.classList.add('hidden');
    }

    loadProfileData();
    switchSettingsSection('perfil');
    
    // Configurar seção de MBTI
    setTimeout(() => {
        if (typeof setupMBTISection === 'function') {
            setupMBTISection();
        }
    }, 100);
    
    updateScrollTopVisibility();
}

function switchSettingsSection(section) {
    // Atualizar navegação
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Atualizar seções
    document.querySelectorAll('.settings-section').forEach(sec => {
        sec.classList.add('hidden');
    });

    const targetSection = document.getElementById(`settings-section-${section}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Aplicar traduções nos elementos visíveis
    setTimeout(() => updateLanguageUI(), 0);
}

// Toggle de idioma na landing page
function toggleLanguage() {
    currentLanguage = currentLanguage === 'pt-BR' ? 'en' : 'pt-BR';
    localStorage.setItem('pracinha-language', currentLanguage);
    updateLanguageUI();
    initLanguageButtons();
}

// Inicializar estado dos botões de idioma
function initLanguageButtons() {
    const buttonText = currentLanguage === 'pt-BR' ? '🇧🇷 PT' : '🇺🇸 EN';
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
        btn.textContent = buttonText;
    });
}

// Aplicar tema
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('pracinha-theme', theme);

    // Atualizar ícones de todos os botões de tema
    const icon = theme === 'dark' ? '☀️' : '🌙';
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = icon;
    });
}

// Toggle de tema
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Atualizar UI com idioma selecionado
function updateLanguageUI() {
    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
        langToggle.textContent = t('btn.language', currentLanguage);
    }

    // Atualizar todos os elementos com data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key, currentLanguage);
    });

    // Atualizar placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key, currentLanguage);
    });

    // Atualizar atributos (data-i18n-attr="attr:key")
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const attrConfig = el.getAttribute('data-i18n-attr');
        const configs = attrConfig.split(',').map(c => c.trim().split(':'));
        configs.forEach(([attr, key]) => {
            el.setAttribute(attr, t(key, currentLanguage));
        });
    });

    // Atualizar atributo lang do HTML
    document.documentElement.lang = currentLanguage;

    const scrollTopBtn = document.getElementById('btn-scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.setAttribute('aria-label', t('btn.scrollTop', currentLanguage));
        scrollTopBtn.title = t('btn.scrollTop', currentLanguage);
    }

    // Atualizar anúncios fixados do admin
    updateAdminAnunciosLanguage();
}

// Atualizar anúncios fixados do admin quando o idioma muda
function updateAdminAnunciosLanguage() {
    const anunciosFixados = document.getElementById('admin-anuncios-fixados');
    if (!anunciosFixados) return;

    const currentLang = currentLanguage || 'pt-BR';
    
    // Atualizar títulos dos cards
    anunciosFixados.querySelectorAll('.admin-anuncio-card').forEach(card => {
        const titulo = currentLang === 'pt-BR' ? card.dataset.tituloPt : card.dataset.tituloEn;
        const tituloElement = card.querySelector('.admin-anuncio-titulo');
        
        if (tituloElement) {
            tituloElement.textContent = titulo;
        }
    });

    // Atualizar modal se estiver aberto - buscar do banco novamente
    const anuncioCompleto = document.getElementById('admin-anuncio-completo');
    if (!anuncioCompleto.classList.contains('hidden')) {
        const emojiLarge = document.getElementById('admin-anuncio-emoji-large');
        const tituloLarge = document.getElementById('admin-anuncio-titulo-large');
        const conteudo = document.getElementById('admin-anuncio-conteudo');
        
        // Encontrar o card ativo
        const activeCard = anunciosFixados.querySelector('.admin-anuncio-card[style*="border"]') || 
                          anunciosFixados.querySelector('.admin-anuncio-card');
        
        if (activeCard && emojiLarge && tituloLarge && conteudo) {
            const emoji = activeCard.dataset.emoji;
            const titulo = currentLang === 'pt-BR' ? activeCard.dataset.tituloPt : activeCard.dataset.tituloEn;
            const anuncioId = activeCard.dataset.anuncioId;

            emojiLarge.textContent = emoji;
            tituloLarge.textContent = titulo;
            conteudo.innerHTML = `<p class="feed-loading">${t('feed.loading', currentLanguage)}</p>`;

            // Buscar conteúdo do banco
            supabase.from('admin_anuncios')
                .select('*')
                .eq('id', anuncioId)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        const conteudoHtml = currentLang === 'pt-BR' ? data.conteudo_pt : data.conteudo_en;
                        conteudo.innerHTML = conteudoHtml || '';
                    }
                });
        }
    }
}

// Expor função no window para componentes externos
window.updateLanguageUI = updateLanguageUI;

function updateFilterOptions(selector, value) {
    document.querySelectorAll(selector).forEach(option => {
        const optionValue = option.dataset.languageFilter || option.dataset.tagFilter || option.dataset.statusFilter;
        option.classList.toggle('active', optionValue === value);
    });
}

function selectContentFilter(value) {
    currentContentFilter = value;

    if (currentContentFilter === 'all') {
        currentLanguageFilter = 'all';
        currentTagFilter = 'all';
        currentStatusFilter = 'all';
        updateFilterOptions('[data-language-filter]', currentLanguageFilter);
        updateFilterOptions('[data-tag-filter]', currentTagFilter);
        updateFilterOptions('[data-status-filter]', currentStatusFilter);
    } else if (currentContentFilter === 'posts') {
        currentStatusFilter = 'all';
        updateFilterOptions('[data-status-filter]', currentStatusFilter);
    } else if (currentContentFilter === 'status') {
        currentLanguageFilter = 'all';
        currentTagFilter = 'all';
        updateFilterOptions('[data-language-filter]', currentLanguageFilter);
        updateFilterOptions('[data-tag-filter]', currentTagFilter);
    }

    document.querySelectorAll('[data-content-filter]').forEach(item => {
        item.classList.toggle('active', item.dataset.contentFilter === currentContentFilter);
    });
    loadFeed();
}

// Configurar event listeners
let eventListenersSetup = false;
let paginaModalListenersInitialized = false;

function setupPaginaModalListeners() {
    if (paginaModalListenersInitialized) {
        return;
    }
    paginaModalListenersInitialized = true;

    // Event listeners para modal de páginas
    const adminCreatePagina = document.getElementById('admin-create-pagina');
    if (adminCreatePagina) {
        adminCreatePagina.addEventListener('click', () => openPaginaModal());
    }

    const paginaModalClose = document.getElementById('pagina-modal-close');
    if (paginaModalClose) {
        paginaModalClose.addEventListener('click', closePaginaModal);
    }

    const paginaCancel = document.getElementById('pagina-cancel');
    if (paginaCancel) {
        paginaCancel.addEventListener('click', closePaginaModal);
    }

    const paginaForm = document.getElementById('pagina-form');
    if (paginaForm) {
        paginaForm.addEventListener('submit', savePagina);
    }

    // Botão de toggle de idioma
    const paginaLangToggle = document.getElementById('pagina-lang-toggle');
    if (paginaLangToggle) {
        paginaLangToggle.addEventListener('click', togglePaginaLang);
    }

    // Botões para criar sub-página
    const addSubpageBtn = document.getElementById('pagina-add-subpage-btn');
    if (addSubpageBtn) {
        addSubpageBtn.addEventListener('click', async () => {
            const parentSlug = document.getElementById('pagina-slug').value;
            const parentTitulo = document.getElementById('pagina-titulo').value;
            
            if (!parentSlug) {
                alert('Salve a página primeiro antes de criar sub-página.');
                return;
            }
            
            // Fechar modal atual
            closePaginaModal();
            
            // Abrir modal para nova sub-página
            setTimeout(() => {
                openPaginaModal();
                // Definir o parent_id
                const parentIdSelect = document.getElementById('pagina-parent-id');
                if (parentIdSelect) {
                    parentIdSelect.value = document.getElementById('pagina-id').value;
                }
            }, 100);
        });
    }

    // Botão para ver sub-páginas
    const viewSubpagesBtn = document.getElementById('pagina-view-subpages-btn');
    if (viewSubpagesBtn) {
        viewSubpagesBtn.addEventListener('click', async () => {
            const paginaId = document.getElementById('pagina-id').value;
            if (!paginaId) {
                alert('Salve a página primeiro antes de ver sub-páginas.');
                return;
            }
            
            // Buscar sub-páginas
            const { data: subpages, error } = await supabase
                .from('paginas')
                .select('*')
                .eq('parent_id', paginaId)
                .order('ordem', { ascending: true });

            if (error) {
                console.error('Erro ao buscar sub-páginas:', error);
                alert('Erro ao buscar sub-páginas.');
                return;
            }

            if (!subpages || subpages.length === 0) {
                alert('Esta página não tem sub-páginas.');
                return;
            }

            // Mostrar lista de sub-páginas
            const subpagesList = subpages.map(sp => 
                `- /${sp.slug} (${sp.titulo_pt})`
            ).join('\n');
            alert(`Sub-páginas:\n${subpagesList}`);
        });
    }

    // Botões de inserção para o editor de páginas
    const paginaInsertPollBtn = document.getElementById('pagina-insert-poll-btn');
    if (paginaInsertPollBtn) {
        paginaInsertPollBtn.addEventListener('click', () => {
            currentEditor = document.getElementById('pagina-conteudo');
            openPollModal();
        });
    }

    const paginaInsertImageBtn = document.getElementById('pagina-insert-image-btn');
    if (paginaInsertImageBtn) {
        paginaInsertImageBtn.addEventListener('click', () => {
            currentEditor = document.getElementById('pagina-conteudo');
            openImageModal();
        });
    }

    const paginaInsertLinkBtn = document.getElementById('pagina-insert-link-btn');
    if (paginaInsertLinkBtn) {
        paginaInsertLinkBtn.addEventListener('click', () => {
            currentEditor = document.getElementById('pagina-conteudo');
            openLinkModal();
        });
    }

    // Botões extras para o editor de páginas
    const paginaInsertQuoteBtn = document.getElementById('pagina-insert-quote-btn');
    if (paginaInsertQuoteBtn) {
        paginaInsertQuoteBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const quote = document.createElement('blockquote');
            quote.innerHTML = '<br>';
            editor.appendChild(quote);
            editor.focus();
        });
    }

    const paginaInsertCodeBtn = document.getElementById('pagina-insert-code-btn');
    if (paginaInsertCodeBtn) {
        paginaInsertCodeBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const code = document.createElement('pre');
            code.innerHTML = '<code>Seu código aqui</code>';
            editor.appendChild(code);
            editor.focus();
        });
    }

    const paginaInsertTableBtn = document.getElementById('pagina-insert-table-btn');
    if (paginaInsertTableBtn) {
        paginaInsertTableBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const table = document.createElement('table');
            table.innerHTML = `
                <tr><th>Cabeçalho 1</th><th>Cabeçalho 2</th></tr>
                <tr><td>Célula 1</td><td>Célula 2</td></tr>
                <tr><td>Célula 3</td><td>Célula 4</td></tr>
            `;
            editor.appendChild(table);
            editor.focus();
        });
    }

    const paginaInsertHighlightBtn = document.getElementById('pagina-insert-highlight-btn');
    if (paginaInsertHighlightBtn) {
        paginaInsertHighlightBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const highlight = document.createElement('div');
            highlight.className = 'page-highlight';
            highlight.innerHTML = 'Frase de destaque aqui';
            editor.appendChild(highlight);
            editor.focus();
        });
    }

    const paginaInsertButtonBtn = document.getElementById('pagina-insert-button-btn');
    if (paginaInsertButtonBtn) {
        paginaInsertButtonBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const btn = document.createElement('button');
            btn.className = 'page-button';
            btn.textContent = 'Clique aqui';
            editor.appendChild(btn);
            editor.focus();
        });
    }

    const paginaInsertAltTitleBtn = document.getElementById('pagina-insert-alt-title-btn');
    if (paginaInsertAltTitleBtn) {
        paginaInsertAltTitleBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const altTitle = document.createElement('h4');
            altTitle.className = 'page-alt-title';
            altTitle.textContent = 'Título Alternante';
            editor.appendChild(altTitle);
            editor.focus();
        });
    }

    const paginaInsertAltListBtn = document.getElementById('pagina-insert-alt-list-btn');
    if (paginaInsertAltListBtn) {
        paginaInsertAltListBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const altList = document.createElement('div');
            altList.className = 'page-alt-list';
            altList.innerHTML = `
                <div class="alt-list-item">Item 1</div>
                <div class="alt-list-item">Item 2</div>
                <div class="alt-list-item">Item 3</div>
            `;
            editor.appendChild(altList);
            editor.focus();
        });
    }

    const paginaInsertDateBtn = document.getElementById('pagina-insert-date-btn');
    if (paginaInsertDateBtn) {
        paginaInsertDateBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
            });
            const dateSpan = document.createElement('span');
            dateSpan.className = 'page-date';
            dateSpan.textContent = dateStr;
            editor.appendChild(dateSpan);
            editor.focus();
        });
    }

    const paginaInsertSignatureBtn = document.getElementById('pagina-insert-signature-btn');
    if (paginaInsertSignatureBtn) {
        paginaInsertSignatureBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const signature = document.createElement('div');
            signature.className = 'page-signature';
            signature.innerHTML = `
                <div class="signature-line">—</div>
                <div class="signature-text">Equipe Pracinha</div>
            `;
            editor.appendChild(signature);
            editor.focus();
        });
    }

    const paginaViewHtmlBtn = document.getElementById('pagina-view-html-btn');
    if (paginaViewHtmlBtn) {
        paginaViewHtmlBtn.addEventListener('click', () => {
            const editor = document.getElementById('pagina-conteudo');
            const htmlContent = editor.innerHTML;
            const cssContent = `
/* Estilos do conteúdo da página */
.page-content blockquote {
    border-left: 4px solid var(--accent-primary);
    padding-left: 16px;
    margin: 16px 0;
    font-style: italic;
}
.page-content pre {
    background: var(--bg-tertiary);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
}
.page-content table {
    width: 100%;
    border-collapse: collapse;
}
.page-content .page-highlight {
    background: var(--accent-subtle);
    padding: 16px;
    border-radius: 8px;
    text-align: center;
}
.page-content .page-button {
    background: var(--accent-primary);
    color: var(--bg-primary);
    padding: 12px 24px;
    border-radius: 8px;
}
.page-content .page-date {
    color: var(--text-secondary);
    font-size: 14px;
}
.page-content .page-signature {
    text-align: right;
    margin-top: 24px;
    color: var(--text-secondary);
}
`;
            alert('HTML:\n\n' + htmlContent + '\n\nCSS:\n\n' + cssContent);
        });
    }

    // Toolbar do editor de páginas
    const paginaToolbarButtons = document.querySelectorAll('#pagina-modal .editor-toolbar button[data-command]');
    paginaToolbarButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const command = button.dataset.command;
            const value = button.dataset.value || null;

            if (command === 'formatBlock' && value) {
                document.execCommand(command, false, value);
            } else {
                document.execCommand(command, false, value);
            }
        });
    });
}

function setupEventListeners() {
    if (eventListenersSetup) {
        return;
    }
    eventListenersSetup = true;

    // Inicializar listeners do modal de páginas
    setupPaginaModalListeners();

    // Toggle de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const themeToggleLogin = document.getElementById('theme-toggle-login');
    if (themeToggleLogin) themeToggleLogin.addEventListener('click', toggleTheme);

    const themeToggleSignup = document.getElementById('theme-toggle-signup');
    if (themeToggleSignup) themeToggleSignup.addEventListener('click', toggleTheme);

    const themeToggleMain = document.getElementById('theme-toggle-main');
    if (themeToggleMain) themeToggleMain.addEventListener('click', toggleTheme);

    // Toggle de idioma na landing page
    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) languageToggle.addEventListener('click', toggleLanguage);

    // Botões da landing page
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            showScreen('login');
        });
    }

    // Botão "Criar conta" na landing — controlado pelo toggle do admin
    const btnSignupLanding = document.getElementById('btn-signup-landing');
    if (btnSignupLanding) {
        btnSignupLanding.addEventListener('click', () => showScreen('signup'));
        // Verificar se cadastro está habilitado
        if (getSiteConfig) {
            getSiteConfig('signup_enabled').then(val => {
                if (val === 'false') {
                    btnSignupLanding.style.display = 'none';
                }
            }).catch(() => {});
        }
    }

    // Link "Criar conta" dentro da tela de login
    const loginGoSignup = document.getElementById('login-go-signup');
    if (loginGoSignup) {
        loginGoSignup.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('signup');
        });
    }

    const goToLogin = document.getElementById('go-to-login');
    if (goToLogin) {
        goToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('login');
        });
    }

    // Formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    // Formulário de cadastro
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSignup();
        });
    }

    const betaAccessModal = document.getElementById('beta-access-modal');
    const betaAccessForm = document.getElementById('beta-access-form');
    const betaAccessClose = document.getElementById('beta-access-modal-close');
    const betaAccessBackdrop = document.getElementById('beta-access-modal-backdrop');
    if (betaAccessForm) betaAccessForm.addEventListener('submit', handleBetaAccessRequest);
    if (betaAccessClose) betaAccessClose.addEventListener('click', closeBetaAccessModal);
    if (betaAccessBackdrop) betaAccessBackdrop.addEventListener('click', closeBetaAccessModal);

    // Modal de confirmação de envio de acesso
    const accessSentClose = document.getElementById('access-sent-modal-close');
    const accessSentOk = document.getElementById('access-sent-ok');
    if (accessSentClose) accessSentClose.addEventListener('click', closeAccessSentModal);
    if (accessSentOk) accessSentOk.addEventListener('click', closeAccessSentModal);

    // Modal de deleção de conta
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', openDeleteAccountModal);

    const deleteAccountModalClose = document.getElementById('delete-account-modal-close');
    if (deleteAccountModalClose) deleteAccountModalClose.addEventListener('click', closeDeleteAccountModal);

    const deleteAccountCancel = document.getElementById('delete-account-cancel');
    if (deleteAccountCancel) deleteAccountCancel.addEventListener('click', closeDeleteAccountModal);

    const deleteAccountForm = document.getElementById('delete-account-form');
    if (deleteAccountForm) deleteAccountForm.addEventListener('submit', handleDeleteAccount);

    // Event listeners para preview de fontes
    const fontTitleSelect = document.getElementById('font-title');
    const fontBodySelect = document.getElementById('font-body');
    if (fontTitleSelect) fontTitleSelect.addEventListener('change', updateFontPreview);
    if (fontBodySelect) fontBodySelect.addEventListener('change', updateFontPreview);

    // Event listener para controle de tamanho do apelido
    const apelidoFontSizeInput = document.getElementById('apelido-font-size');
    const apelidoFontSizeValue = document.getElementById('apelido-font-size-value');
    if (apelidoFontSizeInput && apelidoFontSizeValue) {
        apelidoFontSizeInput.addEventListener('input', (e) => {
            apelidoFontSizeValue.textContent = `${e.target.value}px`;
            updateFontPreview();
        });
    }

    // Event listener para controle de tamanho da fonte geral
    const bodyFontSizeInput = document.getElementById('body-font-size');
    const bodyFontSizeValue = document.getElementById('body-font-size-value');
    if (bodyFontSizeInput && bodyFontSizeValue) {
        bodyFontSizeInput.addEventListener('input', (e) => {
            bodyFontSizeValue.textContent = `${e.target.value}px`;
            updateFontPreview();
            updateSettingsProfilePreview();
        });
    }

    // Event listeners para atualizar mostrário do perfil em tempo real
    const profileFields = [
        'profile-apelido', 'profile-nome', 'profile-username', 'profile-bio',
        'profile-local', 'profile-data-nascimento', 'profile-genero',
        'profile-sexualidade', 'profile-site', 'font-title', 'font-body',
        'apelido-font-size'
    ];

    profileFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateSettingsProfilePreview);
            field.addEventListener('change', updateSettingsProfilePreview);
        }
    });

    // Event listeners para checkboxes de visibilidade
    const visibilityCheckboxes = [
        'show-name', 'show-bio', 'show-local', 'show-idade',
        'show-pronomes', 'show-sexualidade', 'show-site'
    ];

    visibilityCheckboxes.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', updateSettingsProfilePreview);
        }
    });

    // Formulário de conta
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountUpdate);
    }

    // Formulário de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Seleção de tipo de background
    const bgTypeRadios = document.querySelectorAll('input[name="bg-type"]');
    const bgColorGroup = document.querySelector('.bg-color-group');
    const bgImageGroup = document.querySelector('.bg-image-group');
    const bgColorInput = document.getElementById('bg-color');

    if (bgTypeRadios.length && bgColorGroup && bgImageGroup) {
        bgTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const type = e.target.value;

                // Esconder todos os grupos
                bgColorGroup.classList.add('hidden');
                bgImageGroup.classList.add('hidden');

                // Mostrar o grupo correspondente
                if (type === 'color') {
                    bgColorGroup.classList.remove('hidden');
                } else if (type === 'image') {
                    bgImageGroup.classList.remove('hidden');
                }

                // Restaurar background original quando mudar tipo
                if (currentProfile) {
                    applyBackground(currentProfile);
                }
            });
        });
    }

    // Preview de cor de background
    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            const body = document.body;
            body.style.background = color;
            body.style.backgroundImage = '';
        });
    }

    // Upload de imagem de background
    const bgImageUpload = document.getElementById('bg-image-upload');
    const bgImagePreview = document.getElementById('bg-image-preview');
    const bgImagePreviewImg = bgImagePreview?.querySelector('img');
    const btnRemoveBgImage = document.getElementById('btn-remove-bg-image');
    const bgPresetGrid = document.getElementById('bg-preset-grid');

    // Carregar imagens pré-definidas
    if (bgPresetGrid) {
        const presetImages = [
            'design/bg/bg1.jpg',
            'design/bg/bg2.jpg',
            'design/bg/bg3.jpg',
            'design/bg/bg4.jpg',
            'design/bg/bg5.jpg',
            'design/bg/bg6.jpg',
            'design/bg/bg7.jpg',
            'design/bg/bg8.jpg',
            'design/bg/bg9.jpg',
            'design/bg/bg10.jpg',
            'design/bg/bg11.jpg',
            'design/bg/bg12.jpg'
        ];

        bgPresetGrid.innerHTML = presetImages.map((img, index) => `
            <div class="bg-preset-item" data-preset="${img}">
                <img src="${img}" alt="Background ${index + 1}">
            </div>
        `).join('');

        // Seleção de imagem pré-definida
        bgPresetGrid.querySelectorAll('.bg-preset-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remover seleção anterior
                bgPresetGrid.querySelectorAll('.bg-preset-item').forEach(i => i.classList.remove('selected'));
                // Adicionar seleção atual
                item.classList.add('selected');
                // Limpar upload customizado
                if (bgImageUpload) bgImageUpload.value = '';
                if (bgImagePreview) bgImagePreview.classList.add('hidden');

                // Aplicar preview do background
                const presetPath = item.dataset.preset;
                const body = document.body;
                body.style.background = '';
                body.style.backgroundImage = `url(${presetPath})`;
                body.style.backgroundSize = 'cover';
                body.style.backgroundPosition = 'center';
                body.style.backgroundRepeat = 'no-repeat';
                body.style.backgroundAttachment = 'fixed';
            });
        });
    }

    if (bgImageUpload && bgImagePreview && bgImagePreviewImg) {
        bgImageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Mostrar preview
            const reader = new FileReader();
            reader.onload = (event) => {
                bgImagePreviewImg.src = event.target.result;
                bgImagePreview.classList.remove('hidden');

                // Aplicar preview do background
                const body = document.body;
                body.style.background = '';
                body.style.backgroundImage = `url(${event.target.result})`;
                body.style.backgroundSize = 'cover';
                body.style.backgroundPosition = 'center';
                body.style.backgroundRepeat = 'no-repeat';
                body.style.backgroundAttachment = 'fixed';
            };
            reader.readAsDataURL(file);

            // Remover seleção de imagem pré-definida
            if (bgPresetGrid) {
                bgPresetGrid.querySelectorAll('.bg-preset-item').forEach(i => i.classList.remove('selected'));
            }
        });

        // Botão de remover imagem
        if (btnRemoveBgImage) {
            btnRemoveBgImage.addEventListener('click', () => {
                bgImageUpload.value = '';
                bgImagePreviewImg.src = '';
                bgImagePreview.classList.add('hidden');
                // Remover seleção de imagem pré-definida
                if (bgPresetGrid) {
                    bgPresetGrid.querySelectorAll('.bg-preset-item').forEach(i => i.classList.remove('selected'));
                }
                // Restaurar background original
                if (currentProfile) {
                    applyBackground(currentProfile);
                }
            });
        }
    }

    // Restaurar background ao fechar modal de configurações
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalCloseBtn = document.getElementById('settings-modal-close');
    if (settingsModal && settingsModalCloseBtn) {
        const restoreOriginalBackground = () => {
            if (currentProfile) {
                applyBackground(currentProfile);
            }
        };
        settingsModalCloseBtn.addEventListener('click', restoreOriginalBackground);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                restoreOriginalBackground();
            }
        });
    }

    // Navegação entre seções de configurações
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSettingsSection(section);
        });
    });

    // Event delegation para cliques em usernames no feed
    const feedElement = document.getElementById('feed-content');
    if (feedElement) {
        feedElement.addEventListener('click', (e) => {
            const usernameButton = e.target.closest('.mention');
            if (usernameButton) {
                const username = usernameButton.dataset.username;
                if (username) {
                    e.preventDefault();
                    handleUsernameClick(username);
                }
            }

            // Botão de reply
            const replyBtn = e.target.closest('.btn-reply');
            if (replyBtn) {
                const assuntoId = replyBtn.dataset.assuntoId;
                const statusId = replyBtn.dataset.statusId;
                const card = replyBtn.closest('.assunto-card');

                if (assuntoId && card) {
                    e.preventDefault();
                    toggleRepliesPanel(assuntoId, card, 'assunto');
                } else if (statusId && card) {
                    e.preventDefault();
                    toggleRepliesPanel(statusId, card, 'status');
                }
            }
        });
    }

    // Botão "Dar uma volta"
    const btnDarVolta = document.getElementById('btn-dar-volta');
    if (btnDarVolta) {
        btnDarVolta.addEventListener('click', handleDarVolta);
    }

    // Botão postar assunto
    const btnPostarAssunto = document.getElementById('btn-postar-assunto');
    if (btnPostarAssunto) {
        btnPostarAssunto.addEventListener('click', handlePostarAssunto);
    }

    const statusModalClose = document.getElementById('status-modal-close');
    if (statusModalClose) {
        statusModalClose.addEventListener('click', closeStatusModal);
    }

    const statusModalCancel = document.getElementById('status-modal-cancel');
    if (statusModalCancel) {
        statusModalCancel.addEventListener('click', closeStatusModal);
    }

    const statusModalSave = document.getElementById('status-modal-save');
    if (statusModalSave) {
        statusModalSave.addEventListener('click', saveStatus);
    }

    const statusModalDelete = document.getElementById('status-modal-delete');
    if (statusModalDelete) {
        statusModalDelete.addEventListener('click', deleteStatus);
    }

    const btnChangeStatusEmoji = document.getElementById('btn-change-status-emoji');
    if (btnChangeStatusEmoji) {
        btnChangeStatusEmoji.addEventListener('click', handleStatusEmojiChange);
    }

    // Status type buttons
    document.querySelectorAll('.status-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectStatusType(btn.dataset.type, btn.dataset.emoji);
        });
    });

    // Close status modal on backdrop click
    const statusModal = document.getElementById('status-modal');
    if (statusModal) {
        statusModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeStatusModal();
            }
        });
    }

    const tagSwitch = document.getElementById('tag-switch');
    const tagDropdown = document.getElementById('tag-dropdown');
    const assuntoText = document.getElementById('assunto-text');
    const assuntoCounter = document.getElementById('assunto-counter');

    if (tagSwitch) {
        tagSwitch.addEventListener('click', (e) => {
            e.stopPropagation();
            if (tagDropdown) {
                tagDropdown.classList.toggle('open');
            }
        });
    }

    // Event listener para opções de tag (delegação de evento para elementos dinâmicos)
    document.addEventListener('click', (e) => {
        const tagOption = e.target.closest('.tag-option');
        if (tagOption) {
            e.stopPropagation();
            updateSelectedTagChoice(tagOption.dataset.tag || '');
            if (tagDropdown) {
                tagDropdown.classList.remove('open');
            }
        }
    });

    // Ver Todos Visitantes
    document.querySelectorAll('#btn-ver-todos-visitantes, #btn-ver-todos-visitantes-cantinho').forEach(btn => {
        btn.addEventListener('click', () => {
            openUsersModal();
        });
    });

    // Ver Todos Assuntos
    document.querySelectorAll('#btn-ver-todos-assuntos').forEach(btn => {
        btn.addEventListener('click', () => {
            openTagsModal();
        });
    });

    // Fechar Modais de Visitantes e Assuntos
    const usersModalClose = document.getElementById('users-modal-close');
    const usersModalBackdrop = document.getElementById('users-modal-backdrop');
    const tagsModalClose = document.getElementById('tags-modal-close');
    const tagsModalBackdrop = document.getElementById('tags-modal-backdrop');

    if (usersModalClose) usersModalClose.addEventListener('click', closeUsersModal);
    if (usersModalBackdrop) usersModalBackdrop.addEventListener('click', closeUsersModal);
    if (tagsModalClose) tagsModalClose.addEventListener('click', closeTagsModal);
    if (tagsModalBackdrop) tagsModalBackdrop.addEventListener('click', closeTagsModal);

    // Fechar modais com tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const usersModal = document.getElementById('users-modal');
            const tagsModal = document.getElementById('tags-modal');
            if (usersModal && !usersModal.classList.contains('hidden')) {
                closeUsersModal();
            }
            if (tagsModal && !tagsModal.classList.contains('hidden')) {
                closeTagsModal();
            }
        }
    });

    document.querySelectorAll('.add-status-dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
    });
    document.querySelectorAll('.profile-actions-dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
    });

    if (assuntoText && assuntoCounter) {
        const assuntoEditorToolbar = document.getElementById('assunto-editor-toolbar');

        const updateAssuntoCounter = () => {
            const currentLength = assuntoText.value.length;
            const maxLength = Number(assuntoText.maxLength || 280);
            const remaining = maxLength - currentLength;
            assuntoCounter.textContent = String(remaining);
            assuntoCounter.classList.toggle('is-over', remaining < 0);
        };

        const replaceTextareaSelection = (textarea, replacement) => {
            const start = textarea.selectionStart ?? textarea.value.length;
            const end = textarea.selectionEnd ?? textarea.value.length;
            const before = textarea.value.slice(0, start);
            const after = textarea.value.slice(end);
            textarea.value = before + replacement + after;
            const cursor = Math.min(start + replacement.length, textarea.value.length);
            textarea.setSelectionRange(cursor, cursor);
            textarea.focus();
            updateAssuntoCounter();
        };

        const wrapSelection = (textarea, before, after, placeholder) => {
            const start = textarea.selectionStart ?? textarea.value.length;
            const end = textarea.selectionEnd ?? textarea.value.length;
            const selected = textarea.value.slice(start, end) || placeholder;
            replaceTextareaSelection(textarea, `${before}${selected}${after}`);
        };

        const escapeAttribute = (value) => {
            return String(value || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const applyFormat = (format) => {
            switch (format) {
                case 'h1':
                    wrapSelection(assuntoText, '<h1>', '</h1>\n', 'Título grande');
                    break;
                case 'h2':
                    wrapSelection(assuntoText, '<h2>', '</h2>\n', 'Título');
                    break;
                case 'h3':
                    wrapSelection(assuntoText, '<h3>', '</h3>\n', 'Subtítulo');
                    break;
                case 'bold':
                    wrapSelection(assuntoText, '<strong>', '</strong>', 'Texto em negrito');
                    break;
                case 'italic':
                    wrapSelection(assuntoText, '<em>', '</em>', 'Texto em itálico');
                    break;
                case 'underline':
                    wrapSelection(assuntoText, '<u>', '</u>', 'Texto sublinhado');
                    break;
                case 'strike':
                    wrapSelection(assuntoText, '<s>', '</s>', 'Texto riscado');
                    break;
                case 'align-left':
                    wrapSelection(assuntoText, '<div style="text-align:left;">', '</div>\n', 'Texto alinhado à esquerda');
                    break;
                case 'align-center':
                    wrapSelection(assuntoText, '<div style="text-align:center;">', '</div>\n', 'Texto centralizado');
                    break;
                case 'align-right':
                    wrapSelection(assuntoText, '<div style="text-align:right;">', '</div>\n', 'Texto alinhado à direita');
                    break;
                case 'ul': {
                    const selected = assuntoText.value.slice(assuntoText.selectionStart ?? 0, assuntoText.selectionEnd ?? 0) || 'Item 1';
                    const lines = selected.split('\n').map(line => line.trim()).filter(Boolean);
                    const listItems = lines.length ? lines.map(line => `<li>${line}</li>`).join('\n') : '<li>Item 1</li>';
                    replaceTextareaSelection(assuntoText, `<ul>\n${listItems}\n</ul>\n`);
                    break;
                }
                case 'ol': {
                    const selected = assuntoText.value.slice(assuntoText.selectionStart ?? 0, assuntoText.selectionEnd ?? 0) || 'Item 1';
                    const lines = selected.split('\n').map(line => line.trim()).filter(Boolean);
                    const listItems = lines.length ? lines.map(line => `<li>${line}</li>`).join('\n') : '<li>Item 1</li>';
                    replaceTextareaSelection(assuntoText, `<ol>\n${listItems}\n</ol>\n`);
                    break;
                }
                case 'poll': {
                    const question = prompt('Pergunta da enquete:');
                    if (!question) return;
                    const optionsText = prompt('Opções da enquete (separe com ";"):', 'Sim;Não');
                    if (!optionsText) return;
                    const options = optionsText.split(';').map(option => option.trim()).filter(Boolean).slice(0, 5);
                    if (options.length < 2) {
                        alert(t('error.pollMinOptions', currentLanguage));
                        return;
                    }
                    const pollData = {
                        question: question.trim(),
                        options: options.map(label => ({ label, votes: 0 })),
                        votes: {}
                    };
                    const pollDataInput = document.getElementById('assunto-poll-data');
                    if (pollDataInput) {
                        pollDataInput.value = JSON.stringify(pollData);
                    }
                    const pollPreview = `<div class="admin-poll" data-poll="true"><p>${escapeHtml(question.trim())}</p><ul>${options.map(option => `<li>${escapeHtml(option)}</li>`).join('')}</ul></div>\n`;
                    replaceTextareaSelection(assuntoText, pollPreview);
                    break;
                }
                case 'link': {
                    const url = prompt('URL do link:');
                    if (!url) return;
                    wrapSelection(assuntoText, `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener">`, '</a>', 'Texto do link');
                    break;
                }
                case 'image': {
                    const url = prompt('URL da imagem:');
                    if (!url) return;
                    const alt = prompt('Texto alternativo (alt) da imagem:', 'Imagem');
                    replaceTextareaSelection(assuntoText, `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}">\n`);
                    break;
                }
                case 'color': {
                    const color = prompt('Cor do texto (nome ou hexadecimal):', '#000000');
                    if (!color) return;
                    wrapSelection(assuntoText, `<span style="color: ${escapeAttribute(color)};">`, '</span>', 'Texto colorido');
                    break;
                }
                default:
                    break;
            }
        };

        // Comportamento do checkbox de aviso/admin: quando ativo, permitir HTML e ignorar limite
        const avisoAdminCheckbox = document.getElementById('assunto-aviso-admin');

        const applyAdminMode = (isAdminMode) => {
            if (isAdminMode) {
                assuntoText.removeAttribute('maxlength');
                assuntoCounter.classList.add('hidden');
                assuntoEditorToolbar?.classList.remove('hidden');
            } else {
                assuntoText.maxLength = 280;
                assuntoCounter.classList.remove('hidden');
                assuntoEditorToolbar?.classList.add('hidden');
            }
            updateAssuntoCounter();
        };

        if (assuntoEditorToolbar) {
            assuntoEditorToolbar.addEventListener('click', (event) => {
                const button = event.target.closest('.editor-btn');
                if (!button) return;
                const format = button.dataset.format;
                applyFormat(format);
            });
        }

        if (avisoAdminCheckbox) {
            applyAdminMode(avisoAdminCheckbox.checked);
            avisoAdminCheckbox.addEventListener('change', (e) => {
                applyAdminMode(e.target.checked);
            });
        }

        assuntoText.addEventListener('input', updateAssuntoCounter);
        updateAssuntoCounter();
    }

    updateSelectedTagChoice('');

    // Filtros compactos do feed
    document.querySelectorAll('.feed-filter-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (trigger.dataset.contentFilter) {
                selectContentFilter(trigger.dataset.contentFilter);
            }
            const group = trigger.closest('.feed-filter-group');
            const isOpen = group?.classList.contains('open');
            document.querySelectorAll('.feed-filter-group.open').forEach(openGroup => {
                openGroup.classList.remove('open');
                openGroup.querySelector('.feed-filter-trigger')?.setAttribute('aria-expanded', 'false');
            });
            if (group && !isOpen) {
                group.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    document.querySelectorAll('[data-content-filter]:not(.feed-filter-trigger)').forEach(button => {
        button.addEventListener('click', () => {
            selectContentFilter(button.dataset.contentFilter);
        });
    });

    document.querySelectorAll('[data-language-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentLanguageFilter = button.dataset.languageFilter;
            updateFilterOptions('[data-language-filter]', currentLanguageFilter);
            loadFeed();
        });
    });

    document.querySelectorAll('[data-tag-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentTagFilter = button.dataset.tagFilter;
            updateFilterOptions('[data-tag-filter]', currentTagFilter);
            document.querySelectorAll('.tag-btn').forEach(tagButton => {
                tagButton.classList.toggle('active', tagButton.dataset.tag === currentTagFilter);
            });
            loadFeed();
        });
    });

    document.querySelectorAll('[data-status-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentStatusFilter = button.dataset.statusFilter;
            updateFilterOptions('[data-status-filter]', currentStatusFilter);
            loadFeed();
        });
    });

    // Filtros de feed por tag na sidebar
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTagFilter = e.target.dataset.tag;
            updateFilterOptions('[data-tag-filter]', currentTagFilter);
            loadFeed();
        });
    });

    // Interceptar cliques em tags no próprio feed para filtrar
    document.addEventListener('click', (e) => {
        const tagButton = e.target.closest('.assunto-tag');
        if (tagButton) {
            e.preventDefault();
            const tag = tagButton.dataset.tag;
            document.querySelectorAll('.tag-btn').forEach(btn => {
                const isMatch = btn.dataset.tag === tag;
                btn.classList.toggle('active', isMatch);
                if (isMatch) {
                    currentTagFilter = tag;
                    loadFeed();
                }
            });
        }
    });

    // Interações do feed (reações e respostas)
    const feedContent = document.getElementById('feed-content');
    const onlineVisitorsList = document.getElementById('online-visitors-list');
    const cantinhoOnlineVisitorsList = document.getElementById('cantinho-online-visitors-list');
    const adminAvisos = document.getElementById('admin-avisos');
    if (feedContent) {
        feedContent.addEventListener('click', handleFeedInteraction);
        feedContent.addEventListener('submit', handleFeedSubmit);
        feedContent.addEventListener('mouseover', handleMentionHover);
        feedContent.addEventListener('mouseout', handleMentionLeave);
    }

    if (onlineVisitorsList) {
        onlineVisitorsList.addEventListener('click', handleFeedInteraction);
        onlineVisitorsList.addEventListener('mouseover', handleMentionHover);
        onlineVisitorsList.addEventListener('mouseout', handleMentionLeave);
    }

    if (cantinhoOnlineVisitorsList) {
        cantinhoOnlineVisitorsList.addEventListener('click', handleFeedInteraction);
        cantinhoOnlineVisitorsList.addEventListener('mouseover', handleMentionHover);
        cantinhoOnlineVisitorsList.addEventListener('mouseout', handleMentionLeave);
    }

    if (adminAvisos) {
        adminAvisos.addEventListener('click', handleFeedInteraction);
    }

    // Paginação de tags
    const tagPrevBtn = document.getElementById('tag-prev-btn');
    const tagNextBtn = document.getElementById('tag-next-btn');
    if (tagPrevBtn) {
        tagPrevBtn.addEventListener('click', prevTagPage);
    }
    if (tagNextBtn) {
        tagNextBtn.addEventListener('click', nextTagPage);
    }

    setupMentionCardListeners();
    setupEmojiPicker();
    setupScrollTopButton();
    setupPhotoModal();

    // Atalho "/" para focar busca
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        if (e.key === '/') {
            e.preventDefault();
            const searchToggleBtn = document.getElementById('search-toggle-btn');
            const searchInputWrapper = document.getElementById('search-input-wrapper');
            const searchInput = document.getElementById('search-input');
            if (searchToggleBtn && searchInputWrapper && searchInput) {
                searchInputWrapper.classList.remove('hidden');
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // Controle da barra de pesquisa expansível
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchInputWrapper = document.getElementById('search-input-wrapper');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const searchInput = document.getElementById('search-input');

    if (searchToggleBtn && searchInputWrapper) {
        searchToggleBtn.addEventListener('click', () => {
            searchInputWrapper.classList.remove('hidden');
            if (searchInput) {
                searchInput.focus();
            }
        });
    }

    if (searchCloseBtn && searchInputWrapper) {
        searchCloseBtn.addEventListener('click', () => {
            searchInputWrapper.classList.add('hidden');
            if (searchInput) {
                searchInput.value = '';
            }
        });
    }

    // Fechar barra de pesquisa ao pressionar Escape
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchInputWrapper) {
                searchInputWrapper.classList.add('hidden');
                searchInput.value = '';
            }
        });
    }

    // Voltar ao feed pelo header
    const navPracinha = document.getElementById('nav-item-pracinha');
    if (navPracinha) {
        navPracinha.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/feed';
        });
    }

    // Navegação para Meu Cantinho
    const navMeuCantinho = document.getElementById('nav-item-meu-cantinho');
    if (navMeuCantinho) {
        navMeuCantinho.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/cantinho';
        });
    }

    // Navegação para Cineminha
    const navCineminha = document.getElementById('nav-item-cineminha');
    if (navCineminha) {
        navCineminha.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '/cineminha';
        });
    }

    // Navegação mobile
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            if (page === 'adicionar') {
                openAddActionModal();
                return;
            }
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            handleNavigation(page);
        });
    });

    const addActionModalClose = document.getElementById('add-action-modal-close');
    if (addActionModalClose) {
        addActionModalClose.addEventListener('click', closeAddActionModal);
    }
    const addActionModalBackdrop = document.getElementById('add-action-modal-backdrop');
    if (addActionModalBackdrop) {
        addActionModalBackdrop.addEventListener('click', closeAddActionModal);
    }
    const addActionAssunto = document.getElementById('add-action-assunto');
    if (addActionAssunto) {
        addActionAssunto.addEventListener('click', (e) => {
            e.preventDefault();
            closeAddActionModal();
            showFeedView();
            
            // Mostrar formulário de postagem em mobile
            const feedView = document.getElementById('feed-view');
            if (feedView) {
                feedView.classList.add('show-post-form');
            }
            
            const assuntoText = document.getElementById('assunto-text');
            if (assuntoText) {
                assuntoText.focus();
            }
        });
    }

    // Botão para fechar formulário de postagem em mobile
    const closePostFormBtn = document.getElementById('close-post-form-btn');
    if (closePostFormBtn) {
        closePostFormBtn.addEventListener('click', () => {
            const feedView = document.getElementById('feed-view');
            if (feedView) {
                feedView.classList.remove('show-post-form');
            }
        });
    }

    // Mostrar botão de fechar quando formulário estiver ativo em mobile
    const feedView = document.getElementById('feed-view');
    if (feedView) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isShowPostForm = feedView.classList.contains('show-post-form');
                    if (closePostFormBtn) {
                        closePostFormBtn.classList.toggle('hidden', !isShowPostForm);
                    }
                }
            });
        });
        observer.observe(feedView, { attributes: true });
    }
    const addActionStatus = document.getElementById('add-action-status');
    if (addActionStatus) {
        addActionStatus.addEventListener('click', (e) => {
            e.preventDefault();
            closeAddActionModal();
            openStatusModal();
        });
    }

    // Dropdown do avatar (header)
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar) {
        headerAvatar.addEventListener('click', () => {
            toggleAvatarDropdown();
        });
    }
    const dropProfile = document.getElementById('dropdown-profile');
    if (dropProfile) {
        dropProfile.addEventListener('click', () => {
            toggleAvatarDropdown();
            goToSettings();
        });
    }
    const dropMeuCantinho = document.getElementById('dropdown-meu-cantinho');
    if (dropMeuCantinho) {
        dropMeuCantinho.addEventListener('click', () => {
            toggleAvatarDropdown();
            goToMyCantinho();
        });
    }
    const dropAdmin = document.getElementById('dropdown-admin');
    if (dropAdmin) {
        dropAdmin.addEventListener('click', () => {
            toggleAvatarDropdown();
            showAdminView();
        });
    }
    const dropLogout = document.getElementById('dropdown-logout');
    if (dropLogout) {
        dropLogout.addEventListener('click', handleLogout);
    }

    // Upload de foto de perfil
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', handleAvatarFileSelected);
    }

    // Botão flutuante de configurações (mobile)
    const settingsFab = document.getElementById('settings-fab');
    if (settingsFab) {
        settingsFab.addEventListener('click', openSettingsModal);
    }

    // Modal de configurações (mobile)
    const settingsModalClose = document.getElementById('settings-modal-close');
    if (settingsModalClose) {
        settingsModalClose.addEventListener('click', closeSettingsModal);
    }

    const settingsModalBackdrop = document.getElementById('settings-modal-backdrop');
    if (settingsModalBackdrop) {
        settingsModalBackdrop.addEventListener('click', closeSettingsModal);
    }

    // Itens do modal de configurações
    document.querySelectorAll('.settings-modal-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            closeSettingsModal();
            showSettingsView();
            // Ativar a seção correspondente
            document.querySelectorAll('.settings-nav-item').forEach(navItem => {
                navItem.classList.toggle('active', navItem.dataset.section === section);
            });
            document.querySelectorAll('.settings-section').forEach(sec => {
                sec.classList.toggle('hidden', sec.id !== `settings-section-${section}`);
            });
        });
    });

    // Botão de upload de foto nas configurações
    const btnUploadAvatarSettings = document.getElementById('btn-upload-avatar-settings');
    const avatarUploadSettingsInput = document.getElementById('avatar-upload-settings-input');
    
    if (btnUploadAvatarSettings && avatarUploadSettingsInput) {
        btnUploadAvatarSettings.addEventListener('click', () => {
            avatarUploadSettingsInput.value = '';
            avatarUploadSettingsInput.click();
        });

        avatarUploadSettingsInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            
            if (!file.type.startsWith('image/')) {
                alert(t('error.imageOnly', currentLanguage));
                avatarUploadSettingsInput.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert(t('error.imageTooLarge', currentLanguage));
                avatarUploadSettingsInput.value = '';
                return;
            }

            try {
                // Compressão client-side para WebP
                const compressedFile = await compressImageToWebP(file, 0.82);
                await uploadUserPhoto(compressedFile);
                avatarUploadSettingsInput.value = '';
            } catch (error) {
                console.error('Erro ao fazer upload da foto:', error);
                alert(t('error.uploadPhoto', currentLanguage));
            }
        });
    }

    // Upload de imagem do assunto (post)
    const btnAddAssuntoImagem = document.getElementById('btn-add-assunto-imagem');
    const assuntoImagemUpload = document.getElementById('assunto-imagem-upload');
    const btnRemovePreview = document.getElementById('btn-remove-preview');

    if (btnAddAssuntoImagem && assuntoImagemUpload) {
        btnAddAssuntoImagem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentUser) {
                alert(t('error.loginToUpload', currentLanguage));
                return;
            }
            assuntoImagemUpload.click();
        });

        assuntoImagemUpload.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert(t('error.imageOnly', currentLanguage));
                e.target.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert(t('error.imageTooLarge', currentLanguage));
                e.target.value = '';
                return;
            }

            const previewImg = document.getElementById('composer-preview-img');
            const previewContainer = document.getElementById('composer-image-preview');

            try {
                if (previewContainer) {
                    previewContainer.classList.remove('hidden');
                    if (previewImg) {
                        previewImg.src = '';
                        previewImg.style.opacity = '0.5';
                    }
                }

                // Compressão client-side para WebP
                const compressedFile = await compressImageToWebP(file, 0.82);
                selectedAssuntoImageFile = compressedFile;

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg) {
                        previewImg.src = event.target.result;
                        previewImg.style.opacity = '1';
                    }
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error('Erro ao processar imagem:', error);
                alert(t('error.processImage', currentLanguage));
                selectedAssuntoImageFile = null;
                if (previewContainer) previewContainer.classList.add('hidden');
                e.target.value = '';
            }
        });
    }

    if (btnRemovePreview) {
        btnRemovePreview.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedAssuntoImageFile = null;
            const previewContainer = document.getElementById('composer-image-preview');
            const previewImg = document.getElementById('composer-preview-img');
            if (previewContainer) previewContainer.classList.add('hidden');
            if (previewImg) previewImg.src = '';
            if (assuntoImagemUpload) assuntoImagemUpload.value = '';
        });
    }

    document.addEventListener('visibilitychange', handleOnlineVisitorsVisibilityChange);
    window.addEventListener('focus', handleOnlineVisitorsVisibilityChange);

    // Botões para navegar ao Cantinho
    const btnVerMarquinhas = document.getElementById('btn-ver-marquinhas');
    if (btnVerMarquinhas) {
        btnVerMarquinhas.addEventListener('click', () => goToProfile());
    }

    const btnEditarFotosRight = document.getElementById('btn-editar-fotos-right');
    if (btnEditarFotosRight) {
        btnEditarFotosRight.addEventListener('click', () => goToProfile());
    }
}


// Iniciar edição de um assunto (para avisos admin) - função no escopo superior
async function startEditAssunto(avisoId) {
    if (!supabase || !avisoId) return;
    try {
        const { data, error } = await supabase
            .from('assuntos')
            .select('*')
            .eq('id', avisoId)
            .single();
        if (error) throw error;

        showFeedView();
        setTimeout(() => {
            const assuntoText = document.getElementById('assunto-text');
            const avisoAdminCheckbox = document.getElementById('assunto-aviso-admin');
            const btnPostar = document.getElementById('btn-postar-assunto');
            const currentLang = currentLanguage || 'pt-BR';

            const baseText = data[currentLang === 'pt-BR' ? 'texto_pt' : 'texto_en'] || '';
            if (assuntoText) {
                if (data && data.poll_data && data.poll_data.question && Array.isArray(data.poll_data.options)) {
                    const poll = data.poll_data;
                    const pollPreview = `<div class="admin-poll" data-poll="true"><p>${escapeHtml(poll.question)}</p><ul>${poll.options.map(o => `<li>${escapeHtml(o.label)}</li>`).join('')}</ul></div>\n`;
                    assuntoText.value = pollPreview + baseText;
                    const pollDataInput = document.getElementById('assunto-poll-data');
                    if (pollDataInput) pollDataInput.value = JSON.stringify(poll);
                } else {
                    assuntoText.value = baseText;
                }
            }
            if (avisoAdminCheckbox) avisoAdminCheckbox.checked = true;
            if (btnPostar) {
                btnPostar.dataset.originalText = btnPostar.textContent || '';
                btnPostar.textContent = t('btn.save', currentLanguage);
            }

            editingAssuntoId = avisoId;
            assuntoText?.focus();
        }, 200);
    } catch (err) {
        console.error('Erro ao carregar assunto para edição:', err);
        alert(t('error.openEditor', currentLanguage) + (err.message || err));
    }
}

// Handle login
async function handleLogin() {
    if (!isSupabaseConfigured()) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        currentProfile = await getUserProfile(currentUser.id);
        loadUserAvatar();

        // Carregar preferência de idioma do perfil
        if (currentProfile && currentProfile.idioma) {
            currentLanguage = currentProfile.idioma;
            localStorage.setItem('pracinha-language', currentLanguage);
        }

        // Atualizar botões de idioma
        initLanguageButtons();
        updateLanguageUI();

        showScreen('main');
        showFeedView();
        loadFeed();
        initNotifications();
        initOnlineVisitorsTracking();
        initHeaderElements();
        initMusicPlayer();
    } catch (error) {
        console.error('Erro no login:', error.message);
        alert(t('error.login', currentLanguage) + error.message);
    }
}

function openBetaAccessModal() {
    const modal = document.getElementById('beta-access-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeBetaAccessModal() {
    const modal = document.getElementById('beta-access-modal');
    if (modal) modal.classList.add('hidden');
}

function showAccessSentModal() {
    const modal = document.getElementById('access-sent-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeAccessSentModal() {
    const modal = document.getElementById('access-sent-modal');
    if (modal) modal.classList.add('hidden');
}

function openDeleteAccountModal() {
    const modal = document.getElementById('delete-account-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('delete-account-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('delete-account-form')?.reset();
}

async function handleDeleteAccount(event) {
    event.preventDefault();

    const password = document.getElementById('delete-account-password').value;
    if (!password) {
        alert(t('error.currentPasswordRequired', currentLanguage));
        return;
    }

    try {
        // Verificar senha atual
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });

        if (signInError) {
            alert(t('error.wrongPassword', currentLanguage));
            return;
        }

        // Chamar função de soft delete
        const { data: deleteData, error: deleteError } = await supabase
            .rpc('soft_delete_account', {
                p_user_id: currentUser.id,
                p_email: currentUser.email,
                p_username: currentProfile?.username || '',
                p_profile_data: currentProfile || {}
            });

        if (deleteError) throw deleteError;

        const recoveryToken = deleteData[0].recovery_token;
        const expiresAt = deleteData[0].expires_at;

        // Enviar email de recuperação usando Supabase Auth
        const { error: emailError } = await supabase.auth.signInWithOtp({
            email: currentUser.email,
            options: {
                emailRedirectTo: `${window.location.origin}/recover-account?token=${recoveryToken}`,
                data: {
                    recovery_token: recoveryToken,
                    expires_at: expiresAt
                }
            }
        });

        if (emailError) {
            console.error('Erro ao enviar email de recuperação:', emailError);
            console.log('Link de recuperação (fallback):', `${window.location.origin}/recover-account?token=${recoveryToken}`);
        }

        // Deslogar usuário
        await supabase.auth.signOut();
        currentUser = null;
        currentProfile = null;

        closeDeleteAccountModal();
        alert(t('success.accountDeactivated', currentLanguage));
        showScreen('landing');
    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        alert(t('error.deleteAccount', currentLanguage));
    }
}

async function handleBetaAccessRequest(event) {
    event.preventDefault();

    const form = document.getElementById('beta-access-form');
    const emailInput = document.getElementById('beta-access-email');
    const messageInput = document.getElementById('beta-access-message');
    const submitButton = form?.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || '';

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = t('btn.sending', currentLanguage);
    }

    try {
        // Verificar disponibilidade de acessos
        const { data: availability, error: availabilityError } = await supabase
            .rpc('check_access_availability');

        if (availabilityError) throw availabilityError;

        if (!availability || availability.length === 0) {
            alert(t('error.accessExhausted', currentLanguage));
            return;
        }

        const available = availability[0].available;
        if (available <= 0) {
            alert(t('error.accessExhausted', currentLanguage));
            return;
        }

        // Criar pedido de acesso
        const { data: accessData, error: accessError } = await supabase
            .rpc('create_access_request', { p_email: emailInput?.value || '' });

        if (accessError) {
            if (accessError.message.includes('No access available')) {
                alert(t('error.accessExhausted', currentLanguage));
                return;
            }
            throw accessError;
        }

        // Enviar email com link de acesso usando Supabase Auth
        const accessToken = accessData[0].access_token;
        const expiresAt = accessData[0].expires_at;

        // Usar Supabase Auth para enviar magic link com o token de acesso
        const { error: emailError } = await supabase.auth.signInWithOtp({
            email: emailInput?.value || '',
            options: {
                emailRedirectTo: `${window.location.origin}/signup?token=${accessToken}`,
                data: {
                    access_token: accessToken,
                    expires_at: expiresAt
                }
            }
        });

        if (emailError) {
            console.error('Erro ao enviar email:', emailError);
            // Fallback: mostrar link no console se email falhar
            console.log('Link de acesso (fallback):', `${window.location.origin}/signup?token=${accessToken}`);
        }

        if (form) {
            form.reset();
        }
        closeBetaAccessModal();

        // Mostrar modal informativo sobre o email
        showAccessSentModal();

        // Verificar se esgotou após este pedido
        await checkAccessExhaustion();
    } catch (error) {
        console.error('Erro ao pedir acesso:', error);
        alert(t('error.betaAccessRequest', currentLanguage));
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
}

// Funções para gerenciar remessas de acesso
async function loadAccessBatches() {
    try {
        const { data, error } = await supabase
            .from('access_batches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const batchesList = document.getElementById('admin-batches-list');
        if (!batchesList) return;

        if (!data || data.length === 0) {
            batchesList.innerHTML = '<p class="admin-empty">Nenhuma remessa criada.</p>';
            return;
        }

        batchesList.innerHTML = data.map(batch => {
            const available = batch.quantity - batch.used;
            const percentage = Math.round((batch.used / batch.quantity) * 100);
            const statusClass = available === 0 ? 'status-exhausted' : available < 5 ? 'status-low' : 'status-active';

            return `
                <div class="batch-card ${statusClass}">
                    <div class="batch-info">
                        <h4 class="batch-title">Remessa #${batch.id.slice(0, 8)}</h4>
                        <p class="batch-date">Criada em: ${new Date(batch.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="batch-stats">
                        <div class="batch-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="batch-count">${batch.used}/${batch.quantity} usados</span>
                        </div>
                        <span class="batch-available">${available} disponíveis</span>
                    </div>
                    <div class="batch-status">
                        ${available === 0 ? '<span class="status-badge exhausted">Esgotada</span>' :
                          available < 5 ? '<span class="status-badge low">Quase esgotada</span>' :
                          '<span class="status-badge active">Ativa</span>'}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar remessas:', error);
    }
}

function openBatchModal() {
    const modal = document.getElementById('batch-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeBatchModal() {
    const modal = document.getElementById('batch-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('batch-form')?.reset();
}

async function handleBatchCreate(event) {
    event.preventDefault();

    const quantity = document.getElementById('batch-quantity')?.value;
    if (!quantity) return;

    try {
        const { error } = await supabase
            .from('access_batches')
            .insert({
                quantity: parseInt(quantity),
                used: 0,
                created_by: currentUser?.id
            });

        if (error) throw error;

        closeBatchModal();
        loadAccessBatches();
        alert(t('success.batchCreated', currentLanguage));
    } catch (error) {
        console.error('Erro ao criar remessa:', error);
        alert(t('error.createBatch', currentLanguage));
    }
}

// Verificar e notificar admins quando acessos esgotarem
async function checkAccessExhaustion() {
    try {
        const { data, error } = await supabase
            .from('access_batches')
            .select('*')
            .eq('is_active', true)
            .lt('used', 'quantity')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Se não há remessas ativas com disponibilidade, notificar admins
        if (!data || data.length === 0) {
            // TODO: Implementar notificação real para admins
            console.log('Acessos esgotados! Notificar admins.');
            // Aqui você pode criar uma notificação no sistema ou enviar email
        }
    } catch (error) {
        console.error('Erro ao verificar esgotamento:', error);
    }
}

// Validar formato de username
function validateUsername(username) {
    // Username deve começar com @ e ter pelo menos 3 caracteres depois
    const usernameRegex = /^@[a-zA-Z0-9_]{3,}$/;
    return usernameRegex.test(username);
}

// Verificar se username já existe
async function checkUsernameExists(username) {
    if (!supabase) return false;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle(); // maybeSingle não lança erro se não encontrar

        if (error) {
            console.error('Erro ao verificar username:', error);
            return false; // Em caso de erro, permite continuar
        }

        console.log('Username check result:', data);
        return !!data; // Retorna true se encontrou
    } catch (error) {
        console.error('Erro ao verificar username:', error);
        return false; // Em caso de erro, permite continuar
    }
}

// Handle signup
async function handleSignup() {
    console.log('Iniciando signup...');

    if (!isSupabaseConfigured()) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    const apelido = document.getElementById('signup-apelido').value;
    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const terms = document.getElementById('signup-terms').checked;

    // Verificar se cadastro está habilitado
    if (getSiteConfig) {
        try {
            const signupEnabled = await getSiteConfig('signup_enabled');
            if (signupEnabled === 'false') {
                alert('O cadastro está temporariamente desabilitado. Tente novamente mais tarde.');
                showScreen('landing');
                return;
            }
        } catch (e) {
            // Se não conseguir ler, permite continuar
        }
    }

    if (!validateUsername(username)) {
        alert(t('error.usernameFormat', currentLanguage));
        return;
    }

    console.log('Verificando se username existe...');
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
        alert(t('error.usernameExists', currentLanguage));
        return;
    }

    if (password !== confirmPassword) {
        alert(t('error.passwordMismatch', currentLanguage));
        return;
    }

    if (!terms) {
        alert(t('error.acceptTerms', currentLanguage));
        return;
    }

    console.log('Tentando criar conta no Supabase...');
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    apelido: apelido,
                    nome: name,
                    username: username,
                    idioma: currentLanguage
                }
            }
        });

        console.log('Resultado do signup:', { data, error });

        if (error) throw error;

        alert(t('success.accountCreated', currentLanguage));
        showScreen('login');
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        alert(t('error.createAccount', currentLanguage) + error.message);
    }
}

// Handle "Dar uma volta"
async function handleDarVolta() {
    if (!currentUser) {
        alert(t('error.loginToDiscover', currentLanguage));
        return;
    }

    if (!getAllProfiles) {
        alert(t('error.functionUnavailable', currentLanguage));
        return;
    }

    try {
        const profiles = await getAllProfiles();
        
        // Filtrar para excluir o próprio usuário
        const otherProfiles = profiles.filter(p => p.id !== currentUser.id);
        
        if (otherProfiles.length === 0) {
            alert(t('error.noUsersToDiscover', currentLanguage));
            return;
        }

        // Selecionar um perfil aleatório
        const randomIndex = Math.floor(Math.random() * otherProfiles.length);
        const randomProfile = otherProfiles[randomIndex];

        // Navegar para o Cantinho do perfil selecionado usando goToProfile para atualizar a URL
        const username = randomProfile.username;
        if (username) {
            await goToProfile(username);
        } else {
            alert(t('error.profileNoUsername', currentLanguage));
        }
        
    } catch (error) {
        console.error('Erro ao descobrir alguém:', error);
        alert(t('error.discoverUser', currentLanguage) + error.message);
    }
}

function updateSelectedTagChoice(tagValue = '') {
    const select = document.getElementById('assunto-tag');
    const switchButton = document.getElementById('tag-switch');

    if (select) {
        select.value = tagValue || '';
    }

    if (switchButton) {
        switchButton.dataset.tag = tagValue || '';
        switchButton.textContent = tagValue ? getTagDisplay(tagValue) : 'escolha uma tag';
    }
}

// Handle postar assunto
async function handlePostarAssunto() {
    if (!supabase) {
        alert(t('error.supabaseNotConfiguredPost', currentLanguage));
        return;
    }

    if (!currentUser) {
        alert(t('error.loginToPost', currentLanguage));
        return;
    }

    const texto = document.getElementById('assunto-text').value.trim();
    const tag = document.getElementById('assunto-tag').value;
    const avisoAdmin = document.getElementById('assunto-aviso-admin')?.checked || false;

    if (!texto) {
        alert(t('error.emptyPost', currentLanguage));
        return;
    }

    const btnPostar = document.getElementById('btn-postar-assunto');
    const originalText = btnPostar ? btnPostar.textContent : '';
    if (btnPostar) {
        btnPostar.disabled = true;
        btnPostar.textContent = t('btn.sending', currentLanguage);
    }

    try {
        let imageUrl = null;
        if (selectedAssuntoImageFile) {
            imageUrl = await uploadPostPhoto(selectedAssuntoImageFile);
        }

        // Calcular data de expiração (7 dias)
        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + 7);

        const pollExtraction = extractPollDataAndCleanText(texto);
        const pollData = pollExtraction.pollData;
        let textoParaInserir;

        if (avisoAdmin) {
            textoParaInserir = pollExtraction.cleaned;
        } else {
            textoParaInserir = stripHtmlAndTruncate(pollExtraction.cleaned, 280);
        }

        // Para notificar menções, extrair texto limpo sem tags
        const divTemp = document.createElement('div');
        divTemp.innerHTML = texto;
        const textoParaMentions = (divTemp.textContent || divTemp.innerText || '').trim();

        const insertPayload = {
            texto_pt: textoParaInserir,
            texto_en: textoParaInserir,
            tag: tag && tag.trim() ? tag.trim() : null,
            idioma: currentLanguage,
            criado_em: new Date().toISOString(),
            expira_em: expiraEm.toISOString(),
            fixado: false,
            autor: currentUser.id,
            imagem: imageUrl,
            aviso_admin: avisoAdmin
        };
        if (pollData) {
            insertPayload.poll_data = pollData;
        }

        let data, error;
        if (editingAssuntoId) {
            // When editing, don't overwrite criado_em
            delete insertPayload.criado_em;
            const res = await supabase
                .from('assuntos')
                .update(insertPayload)
                .eq('id', editingAssuntoId)
                .select('id')
                .maybeSingle();
            data = res.data; error = res.error;
            if (error) {
                console.error('Erro detalhado do Supabase (update):', error);
                throw error;
            }
            await notifyMentions(textoParaMentions, editingAssuntoId);
            // reset editing state
            editingAssuntoId = null;
        } else {
            const res = await supabase
                .from('assuntos')
                .insert(insertPayload)
                .select('id')
                .maybeSingle();
            data = res.data; error = res.error;
            if (error) {
                console.error('Erro detalhado do Supabase:', error);
                throw error;
            }
            await notifyMentions(textoParaMentions, data.id);
        }

        document.getElementById('assunto-text').value = '';
        updateSelectedTagChoice('');

        // Limpar preview de imagem
        const preview = document.getElementById('composer-image-preview');
        const previewImg = document.getElementById('composer-preview-img');
        if (preview) preview.classList.add('hidden');
        if (previewImg) previewImg.src = '';

        // Esconder formulário de postagem em mobile
        const feedView = document.getElementById('feed-view');
        if (feedView) {
            feedView.classList.remove('show-post-form');
        }

        // Recarregar feed
        loadFeed();

    } catch (error) {
        console.error('Erro ao postar assunto:', error.message);
        alert(t('error.postAssunto', currentLanguage) + error.message);
    } finally {
        if (btnPostar) {
            btnPostar.disabled = false;
            if (btnPostar.dataset && btnPostar.dataset.originalText) {
                btnPostar.textContent = btnPostar.dataset.originalText;
                delete btnPostar.dataset.originalText;
            } else {
                btnPostar.textContent = originalText;
            }
        }
    }
}

// Handle "Jogar assunto"
function openAddActionModal() {
    showFeedView();
    const modal = document.getElementById('add-action-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeAddActionModal() {
    const modal = document.getElementById('add-action-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Carregar avisos do administrador
async function loadAdminAvisos() {
    const adminAvisos = document.getElementById('admin-avisos');
    if (!adminAvisos || !supabase) return;

    try {
        const { data, error } = await supabase
            .from('assuntos')
            .select('id, texto_pt, texto_en, idioma')
            .eq('aviso_admin', true)
            .gt('expira_em', new Date().toISOString())
            .order('criado_em', { ascending: false })
            .limit(4);

        if (error) throw error;

        if (!data || data.length === 0) {
            adminAvisos.classList.add('hidden');
            return;
        }

        renderAdminAvisos(data);
    } catch (err) {
        console.error('Erro ao carregar avisos do administrador:', err);
        adminAvisos.classList.add('hidden');
    }
}

// Funções para gerenciar páginas no painel admin
let paginaCurrentLang = 'pt'; // Estado para controlar o idioma atual no modal

// ---- Seção: Configurações do Site ----
let _siteconfigToggleInitialized = false;

async function loadAdminSiteConfig() {
    // Contador de contas totais
    const totalEl = document.getElementById('stat-siteconfig-total-users');
    if (totalEl && supabase) {
        const { count, error } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
        totalEl.textContent = error ? '–' : (count ?? 0);
    }

    // Toggle de cadastro — inicializar só uma vez
    if (_siteconfigToggleInitialized) return;
    _siteconfigToggleInitialized = true;

    const toggle = document.getElementById('toggle-signup-enabled');
    const label = document.getElementById('toggle-signup-label');
    const feedbackEl = document.getElementById('siteconfig-feedback');
    if (!toggle || !supabase) return;

    // Ler valor atual
    try {
        const { data } = await supabase
            .from('site_config')
            .select('value')
            .eq('key', 'signup_enabled')
            .maybeSingle();
        const enabled = data?.value !== 'false';
        toggle.checked = enabled;
        if (label) label.textContent = enabled ? 'Cadastro aberto' : 'Cadastro fechado';
    } catch (e) {
        console.error('Erro ao ler site_config:', e);
    }

    toggle.addEventListener('change', async () => {
        const newVal = toggle.checked ? 'true' : 'false';
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('site_config')
                .upsert(
                    { key: 'signup_enabled', value: newVal, updated_at: new Date().toISOString(), updated_by: user?.id },
                    { onConflict: 'key' }
                );
            if (error) throw error;

            if (label) label.textContent = toggle.checked ? 'Cadastro aberto' : 'Cadastro fechado';
            if (feedbackEl) {
                feedbackEl.textContent = toggle.checked
                    ? '✓ Cadastro aberto. O botão "Criar conta" está visível na tela inicial.'
                    : '✓ Cadastro fechado. O botão "Criar conta" foi ocultado da tela inicial.';
                feedbackEl.style.color = 'var(--color-success, #16a34a)';
                setTimeout(() => { feedbackEl.textContent = ''; }, 4000);
            }
        } catch (err) {
            console.error('Erro ao salvar site_config:', err);
            toggle.checked = !toggle.checked; // reverter
            if (feedbackEl) {
                feedbackEl.textContent = '✗ Erro ao salvar configuração.';
                feedbackEl.style.color = 'var(--color-error, #dc2626)';
            }
        }
    });
}

// ---- Seção: Páginas ----
async function loadAdminPaginas() {
    const paginasList = document.getElementById('admin-paginas-list');
    if (!paginasList || !supabase) return;

    paginasList.innerHTML = '<p class="admin-loading">Carregando páginas...</p>';

    const { data: paginas, error } = await supabase
        .from('paginas')
        .select('*')
        .order('ordem', { ascending: true });

    if (error) {
        console.error('Erro ao carregar páginas:', error);
        paginasList.innerHTML = '<p class="admin-error">Erro ao carregar páginas.</p>';
        return;
    }

    if (!paginas || paginas.length === 0) {
        paginasList.innerHTML = '<p class="admin-empty">Nenhuma página criada.</p>';
        return;
    }

    paginasList.innerHTML = paginas.map(pagina => {
        const createdAt = new Date(pagina.criado_em).toLocaleString('pt-BR');
        const updatedAt = new Date(pagina.atualizado_em).toLocaleString('pt-BR');
        const statusBadge = pagina.publicado 
            ? '<span class="status-badge published">Publicado</span>'
            : '<span class="status-badge draft">Rascunho</span>';
        const parentInfo = pagina.parent_id 
            ? `<span class="pagina-parent">Sub-página</span>`
            : '<span class="pagina-root">Página raiz</span>';

        return `
            <article class="admin-request-card">
                <div class="admin-request-header">
                    <div>
                        <p class="admin-request-email"><strong>/${escapeHtml(pagina.slug)}</strong> - ${escapeHtml(pagina.titulo_pt)}</p>
                        <p class="admin-request-meta">${parentInfo} | Criado em ${escapeHtml(createdAt)} | Atualizado em ${escapeHtml(updatedAt)}</p>
                    </div>
                    <div class="admin-request-status-group">
                        ${statusBadge}
                    </div>
                </div>
                <div class="admin-request-actions">
                    <button class="btn btn-secondary btn-small" type="button" data-edit-pagina-id="${pagina.id}">Editar</button>
                    <button class="btn btn-danger btn-small" type="button" data-delete-pagina-id="${pagina.id}">Excluir</button>
                </div>
            </article>
        `;
    }).join('');

    paginasList.querySelectorAll('[data-edit-pagina-id]').forEach(button => {
        button.addEventListener('click', () => openPaginaModal(button.dataset.editPaginaId));
    });

    paginasList.querySelectorAll('[data-delete-pagina-id]').forEach(button => {
        button.addEventListener('click', () => deletePagina(button.dataset.deletePaginaId));
    });
}

async function loadPaginaParents(excludeId = null) {
    const parentSelect = document.getElementById('pagina-parent-id');
    if (!parentSelect || !supabase) return;

    const { data: paginas, error } = await supabase
        .from('paginas')
        .select('id, slug, titulo_pt')
        .order('slug', { ascending: true });

    if (error) {
        console.error('Erro ao carregar páginas pai:', error);
        return;
    }

    parentSelect.innerHTML = '<option value="">Nenhuma (página raiz)</option>';
    
    if (paginas && paginas.length > 0) {
        paginas.forEach(pagina => {
            if (excludeId && pagina.id === excludeId) return; // Não permitir selecionar a si mesmo como pai
            parentSelect.innerHTML += `<option value="${pagina.id}">${escapeHtml(pagina.slug)} - ${escapeHtml(pagina.titulo_pt)}</option>`;
        });
    }
}

async function openPaginaModal(paginaId = null) {
    const paginaModal = document.getElementById('pagina-modal');
    if (!paginaModal) return;

    // Carregar opções de páginas pai
    await loadPaginaParents(paginaId);

    const form = document.getElementById('pagina-form');
    const modalTitle = document.getElementById('pagina-modal-title');
    const langToggle = document.getElementById('pagina-lang-toggle');

    // Resetar idioma para PT
    paginaCurrentLang = 'pt';
    if (langToggle) langToggle.textContent = '🇧🇷 PT';

    if (paginaId) {
        // Editar página existente
        modalTitle.textContent = 'Editar Página';
        
        const { data: pagina, error } = await supabase
            .from('paginas')
            .select('*')
            .eq('id', paginaId)
            .single();

        if (error || !pagina) {
            console.error('Erro ao carregar página:', error);
            alert('Erro ao carregar página.');
            return;
        }

        // Armazenar dados dos dois idiomas
        document.getElementById('pagina-id').value = pagina.id;
        document.getElementById('pagina-parent-id').value = pagina.parent_id || '';
        document.getElementById('pagina-slug').value = pagina.slug;
        document.getElementById('pagina-ordem').value = pagina.ordem || 0;
        document.getElementById('pagina-publicado').checked = pagina.publicado;
        
        // Dados PT
        document.getElementById('pagina-titulo').dataset.tituloPt = pagina.titulo_pt;
        document.getElementById('pagina-conteudo').dataset.conteudoPt = pagina.conteudo_pt || '';
        
        // Dados EN
        document.getElementById('pagina-titulo').dataset.tituloEn = pagina.titulo_en;
        document.getElementById('pagina-conteudo').dataset.conteudoEn = pagina.conteudo_en || '';
        
        // Mostrar dados PT inicialmente
        document.getElementById('pagina-titulo').value = pagina.titulo_pt;
        document.getElementById('pagina-conteudo').innerHTML = pagina.conteudo_pt || '';
    } else {
        // Criar nova página
        modalTitle.textContent = 'Criar Página';
        form.reset();
        document.getElementById('pagina-id').value = '';
        document.getElementById('pagina-publicado').checked = true;
        
        // Limpar datasets
        document.getElementById('pagina-titulo').dataset.tituloPt = '';
        document.getElementById('pagina-conteudo').dataset.conteudoPt = '';
        document.getElementById('pagina-titulo').dataset.tituloEn = '';
        document.getElementById('pagina-conteudo').dataset.conteudoEn = '';
    }

    paginaModal.classList.remove('hidden');
}

function togglePaginaLang() {
    const langToggle = document.getElementById('pagina-lang-toggle');
    const tituloInput = document.getElementById('pagina-titulo');
    const conteudoDiv = document.getElementById('pagina-conteudo');
    
    // Salvar dados do idioma atual antes de trocar
    if (paginaCurrentLang === 'pt') {
        tituloInput.dataset.tituloPt = tituloInput.value;
        conteudoDiv.dataset.conteudoPt = conteudoDiv.innerHTML;
        paginaCurrentLang = 'en';
        if (langToggle) langToggle.textContent = '🇺🇸 EN';
        // Carregar dados EN
        tituloInput.value = tituloInput.dataset.tituloEn || '';
        conteudoDiv.innerHTML = conteudoDiv.dataset.conteudoEn || '';
    } else {
        tituloInput.dataset.tituloEn = tituloInput.value;
        conteudoDiv.dataset.conteudoEn = conteudoDiv.innerHTML;
        paginaCurrentLang = 'pt';
        if (langToggle) langToggle.textContent = '🇧🇷 PT';
        // Carregar dados PT
        tituloInput.value = tituloInput.dataset.tituloPt || '';
        conteudoDiv.innerHTML = conteudoDiv.dataset.conteudoPt || '';
    }
}

function closePaginaModal() {
    const paginaModal = document.getElementById('pagina-modal');
    if (paginaModal) {
        paginaModal.classList.add('hidden');
    }
}

async function savePagina(event) {
    event.preventDefault();

    const paginaId = document.getElementById('pagina-id').value;
    const parentId = document.getElementById('pagina-parent-id').value || null;
    const slug = document.getElementById('pagina-slug').value.trim();
    const tituloInput = document.getElementById('pagina-titulo');
    const conteudoDiv = document.getElementById('pagina-conteudo');
    const ordem = parseInt(document.getElementById('pagina-ordem').value) || 0;
    const publicado = document.getElementById('pagina-publicado').checked;

    // Salvar dados do idioma atual antes de salvar
    if (paginaCurrentLang === 'pt') {
        tituloInput.dataset.tituloPt = tituloInput.value;
        conteudoDiv.dataset.conteudoPt = conteudoDiv.innerHTML;
    } else {
        tituloInput.dataset.tituloEn = tituloInput.value;
        conteudoDiv.dataset.conteudoEn = conteudoDiv.innerHTML;
    }

    const tituloPt = tituloInput.dataset.tituloPt || '';
    const tituloEn = tituloInput.dataset.tituloEn || '';
    const conteudoPt = conteudoDiv.dataset.conteudoPt || '';
    const conteudoEn = conteudoDiv.dataset.conteudoEn || '';

    if (!slug || !tituloPt || !tituloEn) {
        alert('Preencha os títulos em ambos os idiomas.');
        return;
    }

    // Validar slug (apenas letras, números e hífens)
    if (!/^[a-z0-9-]+$/.test(slug)) {
        alert('O slug deve conter apenas letras minúsculas, números e hífens.');
        return;
    }

    try {
        if (paginaId) {
            // Atualizar página existente
            const { error } = await supabase
                .from('paginas')
                .update({
                    parent_id: parentId,
                    slug,
                    titulo_pt: tituloPt,
                    titulo_en: tituloEn,
                    conteudo_pt: conteudoPt,
                    conteudo_en: conteudoEn,
                    ordem,
                    publicado
                })
                .eq('id', paginaId);

            if (error) throw error;

            alert('Página atualizada com sucesso!');
        } else {
            // Criar nova página
            const { error } = await supabase
                .from('paginas')
                .insert({
                    parent_id: parentId,
                    slug,
                    titulo_pt: tituloPt,
                    titulo_en: tituloEn,
                    conteudo_pt: conteudoPt,
                    conteudo_en: conteudoEn,
                    ordem,
                    publicado
                });

            if (error) throw error;

            alert('Página criada com sucesso!');
        }

        closePaginaModal();
        await loadAdminPaginas();
    } catch (error) {
        console.error('Erro ao salvar página:', error);
        if (error.code === '23505') {
            alert('Erro: Este slug já está em uso para esta página pai.');
        } else {
            alert('Erro ao salvar página: ' + error.message);
        }
    }
}

async function deletePagina(paginaId) {
    if (!window.confirm('Tem certeza que deseja excluir esta página? As sub-páginas também serão excluídas.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('paginas')
            .delete()
            .eq('id', paginaId);

        if (error) throw error;

        alert('Página excluída com sucesso!');
        await loadAdminPaginas();
    } catch (error) {
        console.error('Erro ao excluir página:', error);
        alert('Erro ao excluir página: ' + error.message);
    }
}

// Carregar anúncios fixados do admin
async function loadAdminAnunciosFixados() {
    const anunciosFixados = document.getElementById('admin-anuncios-fixados');
    if (!anunciosFixados || !supabase) return;

    try {
        const { data, error } = await supabase
            .from('admin_anuncios')
            .select('*')
            .eq('fixado', true)
            .or('expira_em.is.null,expira_em.gt.' + new Date().toISOString())
            .order('criado_em', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            anunciosFixados.classList.add('hidden');
            return;
        }

        renderAdminAnunciosFixados(data);
    } catch (err) {
        console.error('Erro ao carregar anúncios fixados:', err);
        anunciosFixados.classList.add('hidden');
    }
}

// Renderizar anúncios fixados
function renderAdminAnunciosFixados(anuncios) {
    const anunciosFixados = document.getElementById('admin-anuncios-fixados');
    if (!anunciosFixados) return;

    const currentLang = currentLanguage || 'pt-BR';
    const tituloField = currentLang === 'pt-BR' ? 'titulo_pt' : 'titulo_en';

    // Remover classes de quantidade
    anunciosFixados.classList.remove('cards-1', 'cards-2', 'cards-3', 'cards-4');

    // Adicionar classe baseada na quantidade
    const cardCount = Math.min(anuncios.length, 4);
    anunciosFixados.classList.add(`cards-${cardCount}`);

    const html = anuncios.map(anuncio => {
        const currentLang = currentLanguage || 'pt-BR';
        const titulo = currentLang === 'pt-BR' ? anuncio.titulo_pt : anuncio.titulo_en;
        
        return `
        <div class="admin-anuncio-card" data-anuncio-id="${anuncio.id}"
             data-emoji="${escapeHtml(anuncio.emoji)}"
             data-titulo-pt="${escapeHtml(anuncio.titulo_pt)}"
             data-titulo-en="${escapeHtml(anuncio.titulo_en)}"
             data-conteudo-pt=""
             data-conteudo-en=""
             data-imagem="${escapeHtml(anuncio.imagem || '')}"
             data-link="${escapeHtml(anuncio.link || '')}">
            <div class="admin-anuncio-emoji">${escapeHtml(anuncio.emoji)}</div>
            <div class="admin-anuncio-content">
                <div class="admin-anuncio-titulo">${escapeHtml(titulo)}</div>
            </div>
        </div>
        `;
    }).join('');
    
    anunciosFixados.innerHTML = html;

    anunciosFixados.classList.remove('hidden');

    // Adicionar event listeners para abrir modal
    anunciosFixados.querySelectorAll('.admin-anuncio-card').forEach(card => {
        card.addEventListener('click', () => openAdminAnuncioModal(card));
    });
}

// Funções para gerenciar anúncios no painel admin
async function loadAdminAnuncios() {
    const anunciosList = document.getElementById('admin-anuncios-list');
    if (!anunciosList || !supabase) return;

    try {
        const { data, error } = await supabase
            .from('admin_anuncios')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) throw error;

        const anuncios = data || [];
        if (!anuncios.length) {
            anunciosList.innerHTML = '<p class="admin-empty">Nenhum anúncio criado.</p>';
            return;
        }

        anunciosList.innerHTML = anuncios.map(anuncio => {
            const createdAt = new Date(anuncio.criado_em).toLocaleString('pt-BR');
            const expiraEm = anuncio.expira_em ? new Date(anuncio.expira_em).toLocaleString('pt-BR') : 'Nunca';
            const statusBadge = anuncio.fixado ? '<span class="admin-request-status">Fixado</span>' : '<span class="admin-request-status" style="background: #6B6B6B;">Não fixado</span>';

            return `
                <article class="admin-request-card">
                    <div class="admin-request-header">
                        <div>
                            <p class="admin-request-email">${escapeHtml(anuncio.emoji)} ${escapeHtml(anuncio.titulo_pt)}</p>
                            <p class="admin-request-meta">Criado em ${escapeHtml(createdAt)} | Expira em ${escapeHtml(expiraEm)}</p>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="admin-request-actions">
                        <button class="btn btn-secondary btn-small" type="button" data-edit-anuncio-id="${anuncio.id}">Editar</button>
                        <button class="btn btn-secondary btn-small" type="button" data-toggle-fixado-id="${anuncio.id}">${anuncio.fixado ? 'Desfixar' : 'Fixar'}</button>
                        <button class="btn btn-secondary btn-small" type="button" data-delete-anuncio-id="${anuncio.id}">Excluir</button>
                    </div>
                </article>
            `;
        }).join('');

        anunciosList.querySelectorAll('[data-edit-anuncio-id]').forEach(button => {
            button.addEventListener('click', () => openAnuncioModal(button.dataset.editAnuncioId));
        });

        anunciosList.querySelectorAll('[data-toggle-fixado-id]').forEach(button => {
            button.addEventListener('click', () => toggleFixado(button.dataset.toggleFixadoId));
        });

        anunciosList.querySelectorAll('[data-delete-anuncio-id]').forEach(button => {
            button.addEventListener('click', () => deleteAnuncio(button.dataset.deleteAnuncioId));
        });
    } catch (error) {
        console.error(error);
        anunciosList.innerHTML = '<p class="admin-empty">' + t('admin.errorLoadAnnouncementsList', currentLanguage) + '</p>';
    }
}

function openAnuncioModal(anuncioId = null) {
    const anuncioModal = document.getElementById('anuncio-modal');
    if (!anuncioModal) return;

    const modalTitle = document.getElementById('anuncio-modal-title');
    const anuncioIdInput = document.getElementById('anuncio-id');
    const emojiInput = document.getElementById('anuncio-emoji');
    const tituloPtInput = document.getElementById('anuncio-titulo-pt');
    const tituloEnInput = document.getElementById('anuncio-titulo-en');
    const conteudoPtInput = document.getElementById('anuncio-conteudo-pt');
    const conteudoEnInput = document.getElementById('anuncio-conteudo-en');
    const expiraEmInput = document.getElementById('anuncio-expira-em');
    const fixadoInput = document.getElementById('anuncio-fixado');

    if (anuncioId) {
        modalTitle.textContent = t('modal.editAnnouncement', currentLanguage);
        anuncioIdInput.value = anuncioId;
        supabase.from('admin_anuncios').select('*').eq('id', anuncioId).single().then(({ data, error }) => {
            if (error) {
                console.error(error);
                alert(t('error.loadAnnouncement', currentLanguage));
                return;
            }
            if (data) {
                emojiInput.value = data.emoji || '📢';
                tituloPtInput.value = data.titulo_pt || '';
                tituloEnInput.value = data.titulo_en || '';
                conteudoPtInput.innerHTML = data.conteudo_pt || '';
                conteudoEnInput.innerHTML = data.conteudo_en || '';
                expiraEmInput.value = data.expira_em ? data.expira_em.slice(0, 16) : '';
                fixadoInput.checked = data.fixado || false;
            }
        });
    } else {
        modalTitle.textContent = t('modal.createAnnouncement', currentLanguage);
        anuncioIdInput.value = '';
        anuncioModal.querySelector('form').reset();
        emojiInput.value = '📢';
        conteudoPtInput.innerHTML = '';
        conteudoEnInput.innerHTML = '';
    }

    anuncioModal.classList.remove('hidden');
}

function closeAnuncioModal() {
    const anuncioModal = document.getElementById('anuncio-modal');
    if (!anuncioModal) return;
    anuncioModal.classList.add('hidden');
    anuncioModal.querySelector('form').reset();
}

async function saveAnuncio(e) {
    e.preventDefault();

    const anuncioId = document.getElementById('anuncio-id').value;
    const emoji = document.getElementById('anuncio-emoji').value;
    const tituloPt = document.getElementById('anuncio-titulo-pt').value;
    const tituloEn = document.getElementById('anuncio-titulo-en').value;
    const conteudoPt = document.getElementById('anuncio-conteudo-pt').innerHTML;
    const conteudoEn = document.getElementById('anuncio-conteudo-en').innerHTML;
    const expiraEm = document.getElementById('anuncio-expira-em').value;
    const fixado = document.getElementById('anuncio-fixado').checked;

    const anuncioData = {
        emoji,
        titulo_pt: tituloPt,
        titulo_en: tituloEn,
        conteudo_pt: conteudoPt,
        conteudo_en: conteudoEn,
        expira_em: expiraEm ? new Date(expiraEm).toISOString() : null,
        fixado
    };

    try {
        if (anuncioId) {
            const { error } = await supabase
                .from('admin_anuncios')
                .update(anuncioData)
                .eq('id', anuncioId);
            if (error) throw error;
            alert(t('success.announcementUpdated', currentLanguage));
        } else {
            const { error } = await supabase
                .from('admin_anuncios')
                .insert(anuncioData);
            if (error) throw error;
            alert(t('success.announcementCreated', currentLanguage));
        }

        closeAnuncioModal();
        await loadAdminAnuncios();
    } catch (error) {
        console.error(error);
        alert(t('error.saveAnnouncement', currentLanguage));
    }
}

async function toggleFixado(anuncioId) {
    try {
        const { data, error } = await supabase
            .from('admin_anuncios')
            .select('fixado')
            .eq('id', anuncioId)
            .single();

        if (error) throw error;

        const { error: updateError } = await supabase
            .from('admin_anuncios')
            .update({ fixado: !data.fixado })
            .eq('id', anuncioId);

        if (updateError) throw updateError;

        alert(t('success.announcementUpdated', currentLanguage));
        await loadAdminAnuncios();
    } catch (error) {
        console.error(error);
        alert(t('error.updateAnnouncement', currentLanguage));
    }
}

async function deleteAnuncio(anuncioId) {
    if (!window.confirm(t('confirm.deleteAnnouncement', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('admin_anuncios')
            .delete()
            .eq('id', anuncioId);

        if (error) throw error;

        alert(t('success.announcementDeleted', currentLanguage));
        await loadAdminAnuncios();
    } catch (error) {
        console.error(error);
        alert(t('error.deleteAnnouncement', currentLanguage));
    }
}

// Renderizar avisos do administrador
function renderAdminAvisos(avisos) {
    const adminAvisos = document.getElementById('admin-avisos');
    if (!adminAvisos) return;

    const currentLang = currentLanguage || 'pt-BR';
    const titleField = currentLang === 'pt-BR' ? 'texto_pt' : 'texto_en';

    const getAdminAvisoTitle = (texto) => {
        if (!texto) return 'Sem título';
        const div = document.createElement('div');
        div.innerHTML = texto;
        const firstElement = div.firstElementChild;
        if (firstElement && firstElement.tagName === 'H3') {
            return firstElement.textContent || firstElement.innerText || 'Sem título';
        }
        return (div.textContent || div.innerText || '').trim() || 'Sem título';
    };

    adminAvisos.innerHTML = avisos.map(aviso => `
        <div class="admin-aviso-card" data-aviso-id="${aviso.id}" data-texto-pt="${escapeHtml(aviso.texto_pt)}" data-texto-en="${escapeHtml(aviso.texto_en)}">
            <div class="admin-aviso-icon">📢</div>
            <div class="admin-aviso-title">${escapeHtml(getAdminAvisoTitle(aviso[titleField]))}</div>
            ${hasAdminAccess() ? `<button type="button" class="admin-aviso-edit-btn" data-aviso-id="${aviso.id}" title="Editar aviso">✏️</button>` : ''}
        </div>
    `).join('');

    adminAvisos.classList.remove('hidden');

    // Adicionar event listeners para abrir o modal
    adminAvisos.querySelectorAll('.admin-aviso-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Não abrir modal se clicou no botão de editar
            if (e.target.closest('.admin-aviso-edit-btn')) return;
            const currentLang = currentLanguage || 'pt-BR';
            const texto = currentLang === 'pt-BR' ? card.dataset.textoPt : card.dataset.textoEn;
            openAdminAvisoModalWithContent(texto);
        });
    });

    // Edit buttons for admins
    adminAvisos.querySelectorAll('.admin-aviso-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const avisoId = btn.dataset.avisoId;
            startEditAssunto(avisoId);
        });
    });
}

// Abrir modal de aviso do admin com conteúdo específico
function openAdminAvisoModalWithContent(texto) {
    const modal = document.getElementById('admin-aviso-modal');
    const modalBody = document.getElementById('admin-aviso-body');

    if (!modal || !modalBody) return;

    modalBody.innerHTML = texto || '';
    modal.classList.remove('hidden');
}

// Abrir modal com anúncio completo
async function openAdminAnuncioModal(card) {
    const anuncioCompleto = document.getElementById('admin-anuncio-completo');
    const emojiLarge = document.getElementById('admin-anuncio-emoji-large');
    const tituloLarge = document.getElementById('admin-anuncio-titulo-large');
    const conteudo = document.getElementById('admin-anuncio-conteudo');

    if (!anuncioCompleto || !card) return;

    if (!anuncioCompleto.classList.contains('hidden')) {
        closeAdminAnuncioCompleto();
        return;
    }

    const currentLang = currentLanguage || 'pt-BR';
    const emoji = card.dataset.emoji;
    const titulo = currentLang === 'pt-BR' ? card.dataset.tituloPt : card.dataset.tituloEn;
    const anuncioId = card.dataset.anuncioId;

    emojiLarge.textContent = emoji;
    tituloLarge.textContent = titulo;
    conteudo.innerHTML = `<p class="feed-loading">${t('feed.loading', currentLanguage)}</p>`;

    anuncioCompleto.classList.remove('hidden');

    // Buscar conteúdo completo do banco de dados
    try {
        const { data, error } = await supabase
            .from('admin_anuncios')
            .select('*')
            .eq('id', anuncioId)
            .single();

        if (error) throw error;

        const conteudoHtml = currentLang === 'pt-BR' ? data.conteudo_pt : data.conteudo_en;
        conteudo.innerHTML = conteudoHtml || '';
    } catch (err) {
        console.error('Erro ao carregar anúncio:', err);
        conteudo.innerHTML = `<p class="feed-error">${t('feed.error', currentLanguage)}</p>`;
    }
}

// Abrir modal de aviso do admin
function openAdminAvisoModal() {
    const modal = document.getElementById('admin-aviso-modal');
    const modalBody = document.getElementById('admin-aviso-body');
    const adminAvisoBtn = document.getElementById('btn-admin-aviso');

    if (!modal || !modalBody || !adminAvisoBtn) return;

    const currentLang = currentLanguage || 'pt-BR';
    const texto = currentLang === 'pt-BR' ? adminAvisoBtn.dataset.textoPt : adminAvisoBtn.dataset.textoEn;

    modalBody.innerHTML = texto || '';
    modal.classList.remove('hidden');
}

// Fechar modal de aviso do admin
function closeAdminAvisoModal() {
    const modal = document.getElementById('admin-aviso-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Fechar anúncio completo do admin
function closeAdminAnuncioCompleto() {
    const anuncioCompleto = document.getElementById('admin-anuncio-completo');
    if (anuncioCompleto) {
        anuncioCompleto.classList.add('hidden');
    }
}

async function loadFeed() {
    console.log('loadFeed chamado');
    const feedContent = document.getElementById('feed-content');
    console.log('feed-content encontrado:', feedContent);
    if (!feedContent) {
        console.error('feed-content não encontrado');
        return;
    }

    // Aplicar fontes do usuário ao carregar o feed
    if (currentProfile) {
        applyUserFonts(currentProfile);
    }

    // Carregar avisos do administrador
    await loadAdminAvisos();

    // Carregar anúncios fixados do admin
    await loadAdminAnunciosFixados();

    // Carregar assuntos fixados do usuário atual
    if (currentUser && getPinnedAssuntos) {
        await loadPinnedAssuntos(currentUser.id);
    }

    const hasPosts = feedContent.querySelector('.assunto-card');
    const scrollY = window.scrollY;

    if (!hasPosts) {
        feedContent.innerHTML = `<p class="feed-loading">${t('feed.loading', currentLanguage)}</p>`;
    } else {
        feedContent.classList.add('is-updating');
    }

    if (!supabase) {
        console.error('Supabase não configurado');
        feedContent.classList.remove('is-updating');
        feedContent.innerHTML = `<p class="feed-error">${t('feed.error', currentLanguage)}</p>`;
        return;
    }
    console.log('Supabase configurado, iniciando query');

    try {
        let query = supabase
            .from('assuntos')
            .select(`
            *,
            autor:profiles(id, apelido, nome, fotos, username),
            respostas(
    id,
    texto,
    criado_em,
    autor:profiles(id, apelido, nome, fotos, username)
            ),
            reactions(emoji, autor),
            poll_votes(visitante, option_index)
        `)
            .gt('expira_em', new Date().toISOString())
            .order('criado_em', { ascending: false });

        if (currentLanguageFilter !== 'all') {
            query = query.eq('idioma', currentLanguageFilter);
        }

        if (currentTagFilter !== 'all') {
            // Usar ilike para case-insensitive e permitir correspondência parcial
            query = query.ilike('tag', currentTagFilter);
        }

        let { data, error } = await query;

        // Fallback se coluna username ainda não existir no banco
        if (error && /username/i.test(error.message || '')) {
            query = supabase
    .from('assuntos')
    .select(`
    *,
    autor:profiles(id, apelido, nome, fotos),
    respostas(
        id,
        texto,
        criado_em,
        autor:profiles(id, apelido, nome, fotos)
    ),
    reactions(emoji, autor),
    poll_votes(visitante, option_index)
            `)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false });

            if (currentLanguageFilter !== 'all') {
    query = query.eq('idioma', currentLanguageFilter);
            }

            if (currentTagFilter !== 'all') {
    query = query.ilike('tag', currentTagFilter);
            }

            ({ data, error } = await query);
        }

        if (error) {
            console.error('Erro ao carregar feed:', error);
            feedContent.classList.remove('is-updating');
            feedContent.innerHTML = `<p class="feed-error">${t('feed.errorLoad', currentLanguage)}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            feedContent.classList.remove('is-updating');
            feedContent.innerHTML = `<p class="feed-empty">${t('feed.empty', currentLanguage)}</p>`;
            return;
        }

        const feedHtml = await Promise.all(data.map(async assunto => {
            return await createAssuntoCard(assunto);
        }));

        feedContent.innerHTML = feedHtml.join('');
        feedContent.classList.remove('is-updating');

        // Restaurar posição de scroll se possível
        if (scrollY > 0) {
            window.scrollTo(0, scrollY);
        }
    } catch (error) {
        console.error('Erro ao carregar feed:', error);
        feedContent.classList.remove('is-updating');
        feedContent.innerHTML = '<p class="feed-error">' + t('feed.errorLoadRetry', currentLanguage) + '</p>';
    }
}

async function loadFeedWithPost(postId) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Aplicar fontes do usuário ao carregar o feed
    if (currentProfile) {
        applyUserFonts(currentProfile);
    }

    feedContent.innerHTML = `<p class="feed-loading">${t('feed.loading', currentLanguage)}</p>`;

    if (!supabase) {
        feedContent.innerHTML = `<p class="feed-error">${t('feed.error', currentLanguage)}</p>`;
        return;
    }

    try {
        // Buscar o post específico
        const { data: specificPost, error: postError } = await supabase
            .from('assuntos')
            .select(`
    *,
    autor:profiles(id, apelido, nome, fotos, username),
    respostas(
        id,
        texto,
        criado_em,
        autor:profiles(id, apelido, nome, fotos, username)
    ),
    reactions(emoji, autor),
    poll_votes(visitante, option_index)
            `)
            .eq('id', postId)
            .single();

        if (postError || !specificPost) {
            console.error('Erro ao carregar post específico:', postError);
            feedContent.innerHTML = `<p class="feed-error">${t('feed.notFound', currentLanguage)}</p>`;
            return;
        }

        // Buscar os outros posts do feed
        let query = supabase
            .from('assuntos')
            .select(`
    *,
    autor:profiles(id, apelido, nome, fotos, username),
    respostas(
        id,
        texto,
        criado_em,
        autor:profiles(id, apelido, nome, fotos, username)
    ),
    reactions(emoji, autor),
    poll_votes(visitante, option_index)
            `)
            .gt('expira_em', new Date().toISOString())
            .neq('id', postId) // Excluir o post específico
            .order('criado_em', { ascending: false });

        if (currentLanguageFilter !== 'all') {
            query = query.eq('idioma', currentLanguageFilter);
        }

        if (currentTagFilter !== 'all') {
            query = query.ilike('tag', currentTagFilter);
        }

        let { data: otherPosts, error: otherError } = await query;

        if (otherError && /username/i.test(otherError.message || '')) {
            query = supabase
                .from('assuntos')
                .select(`
        *,
        autor:profiles(id, apelido, nome, fotos),
        respostas(
            id,
            texto,
            criado_em,
            autor:profiles(id, apelido, nome, fotos)
        ),
        reactions(emoji, autor),
        poll_votes(visitante, option_index)
    `)
                .gt('expira_em', new Date().toISOString())
                .neq('id', postId)
                .order('criado_em', { ascending: false });

            if (currentLanguageFilter !== 'all') {
                query = query.eq('idioma', currentLanguageFilter);
            }

            if (currentTagFilter !== 'all') {
                query = query.ilike('tag', currentTagFilter);
            }

            ({ data: otherPosts, error: otherError } = await query);
        }

        if (otherError) {
            console.error('Erro ao carregar feed:', otherError);
        }

        // Renderizar o post específico primeiro
        const specificPostHtml = await createAssuntoCard(specificPost);
        
        // Renderizar os outros posts
        let feedHtml = specificPostHtml;
        
        if (otherPosts && otherPosts.length > 0) {
            const otherPostsHtml = await Promise.all(otherPosts.map(async assunto => {
                return await createAssuntoCard(assunto);
            }));
            feedHtml += otherPostsHtml.join('');
        }

        feedContent.innerHTML = feedHtml;

        // Destacar o post específico
        const specificCard = document.querySelector(`.assunto-card[data-assunto-id="${postId}"]`);
        if (specificCard) {
            specificCard.style.transition = 'box-shadow 0.3s ease';
            specificCard.style.boxShadow = '0 0 0 3px var(--accent-primary)';
            setTimeout(() => {
                specificCard.style.boxShadow = '';
            }, 3000);
        }
    } catch (error) {
        console.error('Erro ao carregar feed com post:', error);
        feedContent.innerHTML = `<p class="feed-error">${t('feed.errorLoad', currentLanguage)}</p>`;
    }
            }

            async function loadFeedWithStatus(statusId) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Carregar avisos do administrador
    await loadAdminAvisos();

    feedContent.innerHTML = `<p class="feed-loading">${t('feed.loading', currentLanguage)}</p>`;

    if (!supabase) {
        feedContent.innerHTML = `<p class="feed-error">${t('feed.error', currentLanguage)}</p>`;
        return;
    }

    try {
        // Buscar o status específico diretamente da tabela
        const { data: specificStatus, error: statusError } = await supabase
            .from('user_status')
            .select('*')
            .eq('id', statusId)
            .single();

        if (statusError || !specificStatus) {
            console.error('Erro ao carregar status específico:', statusError);
            feedContent.innerHTML = '<p class="feed-error">Status não encontrado.</p>';
            return;
        }

        // Buscar o perfil do usuário do status
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, apelido, nome, fotos, username')
            .eq('id', specificStatus.user_id)
            .single();

        if (profileError) {
            console.error('Erro ao carregar perfil do status:', profileError);
        }

        // Adicionar o perfil ao status
        specificStatus.profiles = profileData;

        // Buscar os outros status do feed
        const { getRecentStatuses } = await import('./supabase-client.js');
        const allStatuses = await getRecentStatuses();
        const otherStatuses = allStatuses?.filter(s => s.id !== statusId) || [];

        // Buscar os posts do feed
        let query = supabase
            .from('assuntos')
            .select(`
    *,
    autor:profiles(id, apelido, nome, fotos, username),
    respostas(
        id,
        texto,
        criado_em,
        autor:profiles(id, apelido, nome, fotos, username)
    ),
    reactions(emoji, autor),
    poll_votes(visitante, option_index)
            `)
            .gt('expira_em', new Date().toISOString())
            .order('criado_em', { ascending: false });

        if (currentLanguageFilter !== 'all') {
            query = query.eq('idioma', currentLanguageFilter);
        }

        if (currentTagFilter !== 'all') {
            query = query.ilike('tag', currentTagFilter);
        }

        let { data: posts, error: postsError } = await query;

        if (postsError && /username/i.test(postsError.message || '')) {
            query = supabase
                .from('assuntos')
                .select(`
        *,
        autor:profiles(id, apelido, nome, fotos),
        respostas(
            id,
            texto,
            criado_em,
            autor:profiles(id, apelido, nome, fotos)
        ),
        reactions(emoji, autor),
        poll_votes(visitante, option_index)
    `)
                .gt('expira_em', new Date().toISOString())
                .order('criado_em', { ascending: false });

            if (currentLanguageFilter !== 'all') {
                query = query.eq('idioma', currentLanguageFilter);
            }

            if (currentTagFilter !== 'all') {
                query = query.ilike('tag', currentTagFilter);
            }

            ({ data: posts, error: postsError } = await query);
        }

        // Misturar status e posts
        const feedItems = [];

        // Adicionar o status específico primeiro
        feedItems.push({
            type: 'status',
            data: specificStatus,
            date: new Date(specificStatus.updated_at || specificStatus.created_at)
        });

        // Adicionar os outros status
        if (otherStatuses.length > 0) {
            otherStatuses.forEach(status => {
                if (currentStatusFilter !== 'all' && status.type !== currentStatusFilter) return;
                feedItems.push({
                    type: 'status',
                    data: status,
                    date: new Date(status.updated_at || status.created_at)
                });
            });
        }

        // Adicionar os posts
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                feedItems.push({
                    type: 'assunto',
                    data: post,
                    date: new Date(post.criado_em)
                });
            });
        }

        // Ordenar por data (exceto o primeiro que é o status específico)
        const firstItem = feedItems[0];
        const restItems = feedItems.slice(1).sort((a, b) => b.date - a.date);
        const sortedFeedItems = [firstItem, ...restItems];

        await renderMixedFeed(sortedFeedItems);

        // Destacar o status específico
        const specificCard = document.querySelector(`.status-card[data-status-id="${statusId}"]`);
        if (specificCard) {
            specificCard.style.transition = 'box-shadow 0.3s ease';
            specificCard.style.boxShadow = '0 0 0 3px var(--accent-primary)';
            setTimeout(() => {
                specificCard.style.boxShadow = '';
            }, 3000);
        }
    } catch (error) {
        console.error('Erro ao carregar feed com status:', error);
        feedContent.innerHTML = '<p class="feed-error">' + t('feed.errorLoadRetry', currentLanguage) + '</p>';
    }
            }

            // Renderizar feed
            function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
            }

            function getTagDisplay(rawValue) {
    if (!rawValue) return '';

    // Se temos tags do banco, usar cache
    if (tagsCache && tagsCache.length > 0) {
        const normalized = rawValue
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const tag = tagsCache.find(t => t.slug === normalized);
        if (tag) {
            return `${tag.emoji} ${tag.nome}`;
        }
    }

    // Fallback para mapa estático (compatibilidade)
    const normalized = rawValue
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const tagMap = {
        musica: '🎵 Música',
        jogos: '🎮 Jogos',
        livros: '📚 Livros',
        cafe: '☕ Café',
        cotidiano: '🌅 Cotidiano',
        viagem: '✈️ Viagem',
        tecnologia: '💻 Tecnologia',
        filmes: '🎬 Filmes',
        comida: '🍜 Comida',
        esporte: '⚽ Esporte',
        natureza: '🌿 Natureza',
        saude: '💊 Saúde',
        trabalho: '💼 Trabalho',
        moda: '👗 Moda',
        pets: '🐶 Pets',
        humor: '😂 Humor',
        music: '🎵 Música',
        game: '🎮 Jogos',
        books: '📚 Livros',
        coffee: '☕ Café',
        daily: '🌅 Cotidiano',
        travel: '✈️ Viagem'
    };

    return tagMap[normalized] || rawValue;
            }

            // Popular select de tags com tags do banco
            function populateTagSelect() {
    const tagSelect = document.getElementById('assunto-tag');
    const tagOptionsGrid = document.getElementById('tag-options-grid');

    if (!tagSelect) {
        return;
    }

    // Se temos tags do banco, usar elas
    if (tagsCache && tagsCache.length > 0) {
        // Popular o select escondido
        tagSelect.innerHTML = '<option value="">Sem tag</option>' +
            tagsCache.map(tag =>
                `<option value="${escapeHtml(tag.slug)}">${escapeHtml(tag.emoji)} ${escapeHtml(tag.nome)}</option>`
            ).join('');

        // Popular o menu visível com paginação
        renderTagPage();
    } else {
        // Fallback para tags estáticas
        tagSelect.innerHTML = `
            <option value="">Sem tag</option>
            <option value="música">🎵 Música</option>
            <option value="jogos">🎮 Jogos</option>
            <option value="livros">📚 Livros</option>
            <option value="café">☕ Café</option>
            <option value="cotidiano">🌅 Cotidiano</option>
        `;

        if (tagOptionsGrid) {
            tagOptionsGrid.innerHTML = `
    <button type="button" class="tag-option" data-tag="">Sem tag</button>
    <button type="button" class="tag-option" data-tag="música">🎵 Música</button>
    <button type="button" class="tag-option" data-tag="jogos">🎮 Jogos</button>
    <button type="button" class="tag-option" data-tag="livros">📚 Livros</button>
    <button type="button" class="tag-option" data-tag="café">☕ Café</button>
    <button type="button" class="tag-option" data-tag="cotidiano">🌅 Cotidiano</button>
    <button type="button" class="tag-option" data-tag="viagem">✈️ Viagem</button>
            `;
        }
    }
            }

            // Popular filtro de tags do feed
            function populateFeedTagFilter() {
    const feedTagFilterOptions = document.getElementById('feed-tag-filter-options');
    if (!feedTagFilterOptions) return;

    const allTags = tagsCache || [];

    if (allTags.length === 0) {
        feedTagFilterOptions.innerHTML = '';
        return;
    }

    feedTagFilterOptions.innerHTML = allTags.map(tag => {
        const emoji = tag.emoji || '🏷️';
        const nome = tag.nome || 'Sem nome';
        return `
            <button class="feed-filter-option" type="button" data-tag-filter="${escapeHtml(tag.nome)}">
    ${escapeHtml(emoji)} ${escapeHtml(nome)}
            </button>
        `;
    }).join('');

    // Adicionar event listeners para as novas opções
    feedTagFilterOptions.querySelectorAll('[data-tag-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentTagFilter = button.dataset.tagFilter;
            updateFilterOptions('[data-tag-filter]', currentTagFilter);
            document.querySelectorAll('.tag-btn').forEach(tagButton => {
                tagButton.classList.toggle('active', tagButton.dataset.tag === currentTagFilter);
            });
            loadFeed();
        });
    });
            }

            // Renderizar página de tags
            function renderTagPage() {
    const tagOptionsGrid = document.getElementById('tag-options-grid');
    const tagPageInfo = document.getElementById('tag-page-info');
    const tagPrevBtn = document.getElementById('tag-prev-btn');
    const tagNextBtn = document.getElementById('tag-next-btn');

    if (!tagOptionsGrid || !tagsCache) return;

    // Incluir "Sem tag" na contagem
    const totalItems = tagsCache.length + 1; // +1 para "Sem tag"
    const totalPages = Math.ceil(totalItems / tagsPerPage);
    const startIndex = currentTagPage * tagsPerPage;
    const endIndex = startIndex + tagsPerPage;

    // Construir array com "Sem tag" + tags da página
    let pageItems = [];

    // Se a página começa do índice 0, incluir "Sem tag"
    if (startIndex === 0) {
        pageItems.push({ slug: '', emoji: '', nome: 'Sem tag', isSpecial: true });
    }

    // Adicionar tags do banco
    const tagStartIndex = startIndex === 0 ? 0 : startIndex - 1;
    const tagEndIndex = startIndex === 0 ? tagsPerPage - 1 : endIndex - 1;

    const pageTags = tagsCache.slice(tagStartIndex, tagEndIndex);
    pageItems = pageItems.concat(pageTags);

    // Renderizar itens da página atual
    tagOptionsGrid.innerHTML = pageItems.map(item => {
        if (item.isSpecial) {
            return `<button type="button" class="tag-option" data-tag="">Sem tag</button>`;
        }
        return `<button type="button" class="tag-option" data-tag="${escapeHtml(item.slug)}">${escapeHtml(item.emoji)} ${escapeHtml(item.nome)}</button>`;
    }).join('');

    // Atualizar paginação
    if (tagPageInfo) {
        tagPageInfo.textContent = `${currentTagPage + 1} / ${totalPages}`;
    }

    if (tagPrevBtn) {
        tagPrevBtn.disabled = currentTagPage === 0;
    }

    if (tagNextBtn) {
        tagNextBtn.disabled = currentTagPage >= totalPages - 1;
    }
            }

            // Navegar para próxima página de tags
            function nextTagPage() {
    const totalPages = Math.ceil(tagsCache.length / tagsPerPage);
    if (currentTagPage < totalPages - 1) {
        currentTagPage++;
        renderTagPage();
    }
            }

            // Navegar para página anterior de tags
            function prevTagPage() {
    if (currentTagPage > 0) {
        currentTagPage--;
        renderTagPage();
    }
            }

            function renderTrendingTopics(assuntos, containerId = 'sidebar-tags-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const tagCounts = new Map();

    [...(assuntos || [])]
        .filter(assunto => {
            const createdAt = new Date(assunto.criado_em).getTime();
            return !Number.isNaN(createdAt) && createdAt >= cutoff;
        })
        .forEach(assunto => {
            const tag = (assunto.tag || '').trim().toLowerCase();
            if (!tag) return;
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });

    const trending = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([tag]) => ({ tag }));

    if (!trending.length) {
        container.innerHTML = '<p class="reply-empty">Nenhuma tag recente nas últimas 24h.</p>';
        return;
    }

    container.innerHTML = trending.map(item => `
        <button class="tag-btn" type="button" data-tag="${escapeHtml(item.tag)}">
            ${escapeHtml(getTagDisplay(item.tag))}
        </button>
    `).join('');
            }

            function renderEmojiButton(target = '') {
    const targetAttr = target ? ` data-target="${target}"` : '';

    return `
        <button
            type="button"
            class="attachment-btn emoji-picker-btn"
            title="${t('btn.addEmoji', currentLanguage)}"
            aria-label="${t('btn.addEmoji', currentLanguage)}"${targetAttr}
        >
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
        </button>
    `;
            }

            function insertTextAtCursor(textarea, text) {
    if (!textarea) return;

    const maxLength = textarea.maxLength;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    let nextValue = before + text + after;

    if (maxLength > 0 && nextValue.length > maxLength) {
        nextValue = nextValue.slice(0, maxLength);
    }

    textarea.value = nextValue;
    const cursor = Math.min(start + text.length, nextValue.length);
    textarea.setSelectionRange(cursor, cursor);
            }

            function openEmojiPicker(anchor, picker) {
    if (!anchor || !picker) return;

    picker.classList.remove('hidden');
    const rect = anchor.getBoundingClientRect();
    const pickerHeight = picker.offsetHeight || 160;
    const pickerWidth = picker.offsetWidth || 280;
    let top = rect.bottom + 6;
    let left = rect.left;

    if (top + pickerHeight > window.innerHeight - 8) {
        top = rect.top - pickerHeight - 6;
    }

    if (left + pickerWidth > window.innerWidth - 8) {
        left = window.innerWidth - pickerWidth - 8;
    }

    picker.style.top = `${Math.max(8, top)}px`;
    picker.style.left = `${Math.max(8, left)}px`;
            }

            function closeEmojiPicker() {
    document.getElementById('emoji-picker')?.classList.add('hidden');
    emojiPickerTarget = null;
            }

            const SCROLL_TOP_THRESHOLD = 320;

            function getScrollTopContainer() {
    const settingsContent = document.querySelector('.settings-content');
    if (mainScreen?.classList.contains('settings-mode') && settingsContent) {
        return settingsContent;
    }
    return null;
            }

            function getScrollTopPosition() {
    const container = getScrollTopContainer();
    return container ? container.scrollTop : window.scrollY;
            }

            function updateScrollTopVisibility() {
    const btn = document.getElementById('btn-scroll-top');
    if (!btn) return;

    const isMainVisible = mainScreen && !mainScreen.classList.contains('hidden');
    btn.classList.toggle(
        'is-visible',
        Boolean(isMainVisible && getScrollTopPosition() >= SCROLL_TOP_THRESHOLD)
    );
            }

            function setupScrollTopButton() {
    const btn = document.getElementById('btn-scroll-top');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const container = getScrollTopContainer();
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });

    const settingsContent = document.querySelector('.settings-content');
    if (settingsContent) {
        settingsContent.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
    }

    updateScrollTopVisibility();
            }

            function setupEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;

    picker.innerHTML = COMPOSER_EMOJIS.map(emoji => `
        <button type="button" class="emoji-picker-item" data-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>
    `).join('');

    picker.addEventListener('click', (e) => {
        const item = e.target.closest('.emoji-picker-item');
        if (!item || !emojiPickerTarget) return;

        insertTextAtCursor(emojiPickerTarget, item.dataset.emoji);
        emojiPickerTarget.focus();
        closeEmojiPicker();
    });

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.emoji-picker-btn');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();

            const form = trigger.closest('.reply-form');
            const textarea = form
                ? form.querySelector('.reply-input')
                : document.getElementById(trigger.dataset.target || 'assunto-text');

            if (!textarea) return;

            emojiPickerTarget = textarea;

            if (picker.classList.contains('hidden')) {
                openEmojiPicker(trigger, picker);
            } else {
                closeEmojiPicker();
            }
            return;
        }

        if (!e.target.closest('#emoji-picker')) {
            closeEmojiPicker();
        }
    });
            }

            function renderProfileName(nome, username, extraClass = '', roleBadge = '') {
    const displayName = escapeHtml(nome || 'Visitante');
    const classes = ['mention', extraClass].filter(Boolean).join(' ');

    if (username) {
        return `<button type="button" class="${classes}" data-username="${escapeHtml(username)}">${displayName}${roleBadge}</button>`;
    }

    return `<span class="${extraClass || 'profile-name-plain'}">${displayName}${roleBadge}</span>`;
            }

            // Handler para clique em username
            function handleUsernameClick(username) {
    if (username) {
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
        window.location.hash = `/@${cleanUsername}`;
        // Não chamar goToProfile aqui, deixar o handleHashChange fazer isso
    }
            }

            // Configurar roteamento
            function setupRouting() {
    // Verificar hash na URL ao carregar
    handleHashChange();

    // Ouvir mudanças no hash
    window.addEventListener('hashchange', handleHashChange);
            }

            // Handler para mudanças no hash
            function handleHashChange() {
    // Só processar hash se o usuário estiver autenticado
    if (!currentProfile) {
        // Se não estiver autenticado e tiver hash, limpa o hash
        if (window.location.hash) {
            window.location.hash = '';
        }
        return;
    }

    const hash = window.location.hash;

    if (hash.startsWith('#/post/')) {
        // Post específico
        const postId = hash.substring(7); // Remove '#/post/'
        if (postId) {
            showFeedView();
            loadFeedWithPost(postId);
        }
    } else if (hash.startsWith('#/status/')) {
        // Status específico
        let statusId = hash.substring(8); // Remove '#/status/'
        // Remover barra inicial se existir
        if (statusId.startsWith('/')) {
            statusId = statusId.substring(1);
        }
        if (statusId) {
            showFeedView();
            loadFeedWithStatus(statusId);
        }
    } else if (hash.startsWith('#/profile/')) {
        // Cantinho de outro usuário (novo formato)
        const username = hash.substring(10); // Remove '#/profile/'
        if (username) {
            goToProfile(username);
        }
    } else if (hash.startsWith('#/@')) {
        // Cantinho de um usuário (formato antigo - compatibilidade)
        const remaining = hash.substring(3); // Remove '#/@'
        
        // Verificar se é formato /@username/status/id
        const statusMatch = remaining.match(/^([^/]+)\/status\/(.+)$/);
        if (statusMatch) {
            const username = statusMatch[1];
            const statusId = statusMatch[2];
            if (username && statusId) {
                goToProfileWithStatus(username, statusId);
            }
        } else {
            // Cantinho normal
            const username = remaining;
            if (username) {
                goToProfile(username);
            }
        }
    } else if (hash.startsWith('#/@@')) {
        // Caso de @@ duplicado (compatibilidade)
        const username = hash.substring(4); // Remove '#/@@'
        if (username) {
            window.location.hash = `/@${username}`;
            goToProfile(username);
        }
    } else if (hash === '#/cantinho') {
        // Meu Cantinho
        goToProfile(null);
    } else if (hash === '#/settings') {
        // Configurações
        showSettingsView();
    } else if (hash === '#/admin') {
        // Painel Admin
        showAdminView();
    } else if (hash.startsWith('#/page/')) {
        // Página personalizada
        const slugPath = hash.substring(7); // Remove '#/page/'
        if (slugPath) {
            showPageView();
            loadPage(slugPath);
        }
    } else if (hash === '#/feed' || hash === '' || hash === '#') {
        // Feed principal
        showFeedView();
        loadFeed();
        window.scrollTo(0, 0);
    }
            }

            function openPhotoModal(imageUrl, altText = '') {
    const modal = document.getElementById('photo-view-modal');
    const image = document.getElementById('photo-view-image');
    if (!modal || !image || !imageUrl) return;

    image.src = imageUrl;
    image.alt = altText || 'Foto maior';
    modal.classList.remove('hidden');
            }

            function closePhotoModal() {
    const modal = document.getElementById('photo-view-modal');
    const image = document.getElementById('photo-view-image');
    if (!modal || !image) return;

    modal.classList.add('hidden');
    image.removeAttribute('src');
    image.alt = '';
            }

            function setupPhotoModal() {
    const modal = document.getElementById('photo-view-modal');
    const closeButton = document.getElementById('photo-modal-close');
    const backdrop = modal?.querySelector('.photo-modal-backdrop');

    if (!modal) return;

    closeButton?.addEventListener('click', closePhotoModal);
    backdrop?.addEventListener('click', closePhotoModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closePhotoModal();
        }
    });
            }

            function formatTextWithMentions(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
        /@([a-zA-Z0-9_]{3,})/g,
        (_, user) => `<button type="button" class="mention" data-username="@${user}">@${user}</button>`
    );
            }

            // Para posts de admin que contêm HTML: inserir HTML cru, mas ainda transformar menções
            function processAdminHtml(html) {
    if (!html) return '';
    return html.replace(/@([a-zA-Z0-9_]{3,})/g, (_, user) => `<button type="button" class="mention" data-username="@${user}">@${user}</button>`);
            }

            function renderPollMarkup(pollData, votes = [], assuntoId = '') {
    if (!pollData || !pollData.question || !Array.isArray(pollData.options)) return '';
    const counts = Array(pollData.options.length).fill(0);
    let userVoteIndex = null;

    votes.forEach(vote => {
        const idx = Number(vote.option_index);
        if (!Number.isNaN(idx) && idx >= 0 && idx < counts.length) {
            counts[idx] += 1;
            if (currentUser && vote.visitante === currentUser.id) {
                userVoteIndex = idx;
            }
        }
    });

    const totalVotes = counts.reduce((sum, value) => sum + value, 0);

    return `
        <div class="admin-poll" data-poll="true" data-assunto-id="${escapeHtml(assuntoId)}">
            <p>${escapeHtml(pollData.question)}</p>
            <ul>
    ${pollData.options.map((option, index) => `
        <li>
            <button type="button" class="poll-vote-btn${userVoteIndex === index ? ' selected' : ''}" data-poll-index="${index}">${escapeHtml(option.label)}</button>
            <span class="poll-votes">${counts[index]} ${counts[index] === 1 ? t('poll.vote', currentLanguage) : t('poll.votes', currentLanguage)}</span>
        </li>
    `).join('')}
            </ul>
            <div class="poll-votes">Total: ${totalVotes} ${totalVotes === 1 ? t('poll.vote', currentLanguage) : t('poll.votes', currentLanguage)}</div>
        </div>
    `;
            }

            async function votePoll(postId, optionIndex, button) {
    if (!currentUser || !supabase || !votePollOption) {
        alert('Você precisa estar logado para votar.');
        return;
    }

    try {
        button.disabled = true;
        const { success, error } = await votePollOption(postId, optionIndex, currentUser.id);
        if (!success) {
            throw error || new Error('Não foi possível votar.');
        }
        await loadFeed();
    } catch (err) {
        console.error('Erro ao votar na enquete:', err);
        alert(t('error.votePollRetry', currentLanguage) + (err.message || ''));
    } finally {
        button.disabled = false;
    }
            }

            async function fetchProfileByUsername(username) {
    if (!supabase || !username) return null;

    // Normalizar o username removendo o @ inicial
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const key = normalizedUsername;
    
    if (profileCache.has(key)) return profileCache.get(key);

    const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, username, fotos, recado, pais, bio')
        .eq('username', normalizedUsername)
        .maybeSingle();

    if (error || !data) return null;

    profileCache.set(key, data);
    return data;
            }

            function getProfileAvatarUrl(profile) {
    if (profile?.fotos?.[0]) return profile.fotos[0];
    const initials = profile?.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || profile?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
            <rect width="44" height="44" fill="#D4C4A8"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#4A7C59" font-family="Arial">${initials}</text>
        </svg>
    `)}`;
            }

            function isProfileOnline(profile) {
    if (!profile?.ultimo_acesso) return false;

    const lastAccess = new Date(profile.ultimo_acesso);
    if (Number.isNaN(lastAccess.getTime())) return false;

    return Date.now() - lastAccess.getTime() <= ONLINE_THRESHOLD_MS;
            }

            function renderOnlineVisitors(profiles, listId = 'online-visitors-list', countId = 'active-count-text') {
    const list = document.getElementById(listId);
    const countEl = document.getElementById(countId);
    if (!list || !countEl) return;

    const onlineProfiles = (profiles || []).filter(isProfileOnline);
    countEl.textContent = String(onlineProfiles.length);

    if (onlineProfiles.length === 0) {
        list.innerHTML = '<div class="visitor-item"><div class="visitor-avatar-placeholder">•</div></div>';
        return;
    }

    const visibleProfiles = onlineProfiles.slice(0, 8);
    list.innerHTML = visibleProfiles.map(profile => {
        const avatarUrl = profile.fotos?.[0];
        const initials = profile?.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || profile?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
        const displayName = profile.apelido || profile.nome || 'Visitante';
        const username = profile.username || '';
        const avatarMarkup = avatarUrl
            ? `<img src="${avatarUrl}" alt="${escapeHtml(displayName)}" class="visitor-avatar avatar-clickable" data-photo-url="${avatarUrl}" data-photo-alt="${escapeHtml(displayName)}" data-username="${escapeHtml(username)}" role="button" tabindex="0">`
            : `<div class="visitor-avatar-placeholder" data-username="${escapeHtml(username)}">${escapeHtml(initials)}</div>`;

        return `
            <button type="button" class="visitor-item visitor-name-button" data-username="${escapeHtml(username)}">
    ${avatarMarkup}
            </button>
        `;
    }).join('');
            }

            async function updateCurrentUserPresence() {
    if (!supabase || !currentUser) return;

    try {
        await supabase
            .from('profiles')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', currentUser.id);
    } catch (error) {
        console.warn('Não foi possível atualizar presença:', error);
    }
            }

            async function loadOnlineVisitors() {
    if (!supabase) {
        renderOnlineVisitors([]);
        return;
    }

    try {
        await updateCurrentUserPresence();

        const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nome, fotos, username, ultimo_acesso')
            .gt('ultimo_acesso', cutoff)
            .order('ultimo_acesso', { ascending: false })
            .limit(8);

        if (error) throw error;
        renderOnlineVisitors(data || []);
    } catch (error) {
        console.error('Erro ao carregar visitantes online:', error);
        renderOnlineVisitors([]);
    }
            }

            async function loadOnlineVisitorsForCantinho() {
    if (!supabase) {
        renderOnlineVisitors([], 'cantinho-online-visitors-list', 'cantinho-active-count-text');
        return;
    }

    try {
        await updateCurrentUserPresence();

        const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nome, fotos, username, ultimo_acesso')
            .gt('ultimo_acesso', cutoff)
            .order('ultimo_acesso', { ascending: false })
            .limit(8);

        if (error) throw error;
        renderOnlineVisitors(data || [], 'cantinho-online-visitors-list', 'cantinho-active-count-text');
    } catch (error) {
        console.error('Erro ao carregar visitantes online no Cantinho:', error);
        renderOnlineVisitors([], 'cantinho-online-visitors-list', 'cantinho-active-count-text');
    }
            }

            async function loadTrendingTopicsForCantinho() {
    if (!supabase) {
        renderTrendingTopics([], 'cantinho-sidebar-tags-container');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('assuntos')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(100);

        if (error) throw error;
        renderTrendingTopics(data || [], 'cantinho-sidebar-tags-container');
    } catch (error) {
        console.error('Erro ao carregar assuntos de hoje no Cantinho:', error);
        renderTrendingTopics([], 'cantinho-sidebar-tags-container');
    }
            }

            function stopOnlineVisitorsTracking() {
    if (onlineVisitorsInterval) {
        clearInterval(onlineVisitorsInterval);
        onlineVisitorsInterval = null;
    }
            }

            function initOnlineVisitorsTracking() {
    if (!supabase) return;

    stopOnlineVisitorsTracking();
    loadOnlineVisitors();

    onlineVisitorsInterval = setInterval(() => {
        loadOnlineVisitors();
    }, 30000);
            }

            function handleOnlineVisitorsVisibilityChange() {
    if (document.visibilityState === 'hidden') return;
    updateCurrentUserPresence();
    loadOnlineVisitors();
            }

            function positionMentionCard(anchor) {
    const card = document.getElementById('mention-profile-card');
    if (!card || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const cardWidth = 240;
    const margin = 8;
    let left = rect.left;
    let top = rect.bottom + margin;

    if (left + cardWidth > window.innerWidth - margin) {
        left = window.innerWidth - cardWidth - margin;
    }
    if (left < margin) left = margin;

    if (top + card.offsetHeight > window.innerHeight - margin) {
        top = rect.top - card.offsetHeight - margin;
    }

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
            }

            function hideMentionCard() {
    const card = document.getElementById('mention-profile-card');
    if (card) card.classList.add('hidden');
    activeMentionAnchor = null;
            }

            function scheduleHideMentionCard() {
    clearTimeout(mentionCardHideTimeout);
    mentionCardHideTimeout = setTimeout(hideMentionCard, 180);
            }

            function cancelHideMentionCard() {
    clearTimeout(mentionCardHideTimeout);
            }

            async function showMentionCard(anchor, username) {
    const card = document.getElementById('mention-profile-card');
    const loading = card?.querySelector('.mention-card-loading');
    const content = card?.querySelector('.mention-card-content');
    if (!card || !anchor || !username) return;

    activeMentionAnchor = anchor;
    cancelHideMentionCard();

    card.classList.remove('hidden');
    loading?.classList.remove('hidden');
    content?.classList.add('hidden');
    positionMentionCard(anchor);

    const profile = await fetchProfileByUsername(username);
    if (activeMentionAnchor !== anchor) return;

    if (!profile) {
        hideMentionCard();
        return;
    }

    const avatarEl = document.getElementById('mention-card-avatar');
    const nameEl = document.getElementById('mention-card-name');
    const usernameEl = document.getElementById('mention-card-username');
    const statusEl = document.getElementById('mention-card-status');

    if (avatarEl) avatarEl.src = getProfileAvatarUrl(profile);
    if (nameEl) nameEl.textContent = profile.apelido || profile.nome || 'Visitante';
    if (usernameEl) usernameEl.textContent = profile.username || username;

    const statusParts = [];
    if (profile.recado) statusParts.push(`💬 ${profile.recado}`);
    else if (profile.pais) statusParts.push(profile.pais);
    if (profile.bio) statusParts.push(profile.bio);

    if (statusEl) {
        statusEl.textContent = statusParts.join(' · ') || '';
        statusEl.classList.toggle('hidden', statusParts.length === 0);
    }

    loading?.classList.add('hidden');
    content?.classList.remove('hidden');
    positionMentionCard(anchor);
            }

            function handleMentionHover(e) {
    const mention = e.target.closest('.mention, .visitor-name-button');
    if (!mention) return;
    showMentionCard(mention, mention.dataset.username);
            }

            function handleMentionLeave(e) {
    const mention = e.target.closest('.mention, .visitor-name-button');
    const card = document.getElementById('mention-profile-card');
    const related = e.relatedTarget;

    if (mention && card?.contains(related)) return;
    if (card?.contains(e.target) && card.contains(related)) return;
    if (mention || card?.contains(e.target)) {
        scheduleHideMentionCard();
    }
            }

            function setupMentionCardListeners() {
    const card = document.getElementById('mention-profile-card');
    if (!card) return;

    card.addEventListener('mouseenter', cancelHideMentionCard);
    card.addEventListener('mouseleave', scheduleHideMentionCard);

    const viewProfileBtn = document.getElementById('mention-card-view-profile');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const username = document.getElementById('mention-card-username')?.textContent;
            if (username) {
                hideMentionCard();
                goToProfile(username);
            }
        });
    }
            }

            function parseMentions(text) {
    if (!text) return [];
    const matches = text.match(/@[a-zA-Z0-9_]{3,}/g) || [];
    return [...new Set(matches)];
            }

            async function notifyMentions(texto, assuntoId, respostaId = null, skipUserIds = []) {
    if (!supabase || !currentUser) return;

    const mentions = parseMentions(texto);
    if (mentions.length === 0) return;

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username')
            .in('username', mentions);

        if (error) throw error;

        const skipSet = new Set([currentUser.id, ...skipUserIds]);
        const notifications = (profiles || [])
            .filter(profile => profile.id && !skipSet.has(profile.id))
            .map(profile => ({
                destinatario: profile.id,
                remetente: currentUser.id,
                tipo: 'mencao',
                assunto: assuntoId,
                resposta_id: respostaId
            }));

        if (notifications.length === 0) return;

        const { error: insertError } = await supabase
            .from('notificacoes')
            .insert(notifications);

        if (insertError) throw insertError;
    } catch (error) {
        console.error('Erro ao notificar menções:', error);
    }
            }

            function formatReplyCount(count) {
    if (count === 0) return t('replies.none', currentLanguage);
    if (count === 1) return t('replies.one', currentLanguage);
    return t('replies.many', currentLanguage, {n: count});
            }

            function aggregateReactions(reactions) {
    const counts = Object.fromEntries(REACTION_EMOJIS.map(e => [e, 0]));
    let userReaction = null;

    (reactions || []).forEach(reaction => {
        if (counts[reaction.emoji] !== undefined) {
            counts[reaction.emoji]++;
        }
        if (currentUser && reaction.autor === currentUser.id) {
            userReaction = reaction;
        }
    });

    return { counts, userReaction };
            }

            function renderReactionButtons(itemId, reactions, itemType = 'assunto') {
    const { counts, userReaction } = aggregateReactions(reactions);
    const dataAttribute = itemType === 'status' ? 'data-status-id' : 'data-assunto-id';

    return REACTION_EMOJIS.map(emoji => {
        const count = counts[emoji] || 0;
        const isActive = userReaction?.emoji === emoji;
        const countHtml = count > 0 ? `<span class="reaction-count">${count}</span>` : '';

        return `
            <button
    type="button"
    class="reaction-btn ${count > 0 ? 'has-count' : 'is-empty'}${isActive ? ' is-active' : ''}"
    ${dataAttribute}="${itemId}"
    data-emoji="${emoji}"
    data-item-type="${itemType}"
    aria-label="${emoji}"
            >
    ${countHtml}<span class="reaction-emoji">${emoji}</span>
            </button>
        `;
    }).join('');
            }

            function isContentOwner(autorProfile) {
    if (!autorProfile) return false;
    const autorId = typeof autorProfile === 'string' ? autorProfile : autorProfile?.id;
    return Boolean(currentUser && autorId === currentUser.id);
            }

            function renderOptionsDropdown(type, id, assuntoId = null, statusId = null, canPin = false, canDelete = false, isPinned = false) {
    const assuntoAttr = assuntoId ? ` data-assunto-id="${assuntoId}"` : '';
    const statusAttr = statusId ? ` data-status-id="${statusId}"` : '';
    const dropdownId = `dropdown-${type}-${id}`;

    return `
        <div class="options-dropdown-container">
            <button
    type="button"
    class="options-dropdown-btn"
    data-dropdown-id="${dropdownId}"
    title="Opções"
            >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="12" cy="5" r="1"/>
        <circle cx="12" cy="19" r="1"/>
    </svg>
            </button>
            <div class="options-dropdown-menu hidden" id="${dropdownId}">
    ${canPin ? `
        <button type="button" class="dropdown-item" data-action="pin"${assuntoAttr}>
            ${isPinned ? '📌 Desfixar' : '📍 Fixar'}
        </button>
    ` : ''}
    ${canDelete ? `
        <button type="button" class="dropdown-item" data-action="delete" data-delete-type="${type}" data-id="${id}"${assuntoAttr}${statusAttr}>
            🗑️ Excluir
        </button>
    ` : ''}
    <button type="button" class="dropdown-item" data-action="report"${assuntoAttr}${statusAttr}>
        ⚠️ Denunciar
    </button>
            </div>
        </div>
    `;
            }

            function renderPinButton(assunto) {
    const isPinned = assunto.fixado === true;
    const pinIcon = isPinned ? '📌' : '📍';
    const pinTitle = isPinned ? 'Desfixar assunto' : 'Fixar assunto';
    const pinClass = isPinned ? 'pin-btn pinned' : 'pin-btn';

    return `
        <button
            type="button"
            class="${pinClass}"
            data-assunto-id="${assunto.id}"
            title="${pinTitle}"
        >${pinIcon}</button>
    `;
            }

            function renderReplyItem(resposta, assuntoId, isStatus = false) {
    const autor = typeof resposta.autor === 'object' ? resposta.autor : null;
    const autorNome = autor?.apelido || autor?.nome || resposta.autor_nome || 'Visitante';
    const autorFoto = autor?.fotos?.[0] || resposta.autor_foto || '';
    const autorUsername = autor?.username || resposta.autor_username || '';
    let autorId = null;

    if (autor?.id) {
        autorId = String(autor.id);
    } else if (typeof resposta.autor === 'string') {
        autorId = resposta.autor;
    }

    const isOwner = autorId ? isContentOwner(autorId) : false;
    const avatarMarkup = autorFoto
        ? `<img src="${autorFoto}" alt="${escapeHtml(autorNome)}" class="reply-avatar avatar-clickable" data-photo-url="${autorFoto}" data-photo-alt="${escapeHtml(autorNome)}" data-username="${escapeHtml(autorUsername)}" role="button" tabindex="0">`
        : `<div class="reply-avatar reply-avatar-placeholder" data-username="${escapeHtml(autorUsername)}">${escapeHtml(autorNome.charAt(0))}</div>`;
    const metaActions = [];

    if (autorUsername) {
        metaActions.push(`
            <button
    type="button"
    class="reply-to-btn"
    data-assunto-id="${assuntoId}"
    data-username="${escapeHtml(autorUsername)}"
            >${t('btn.replyTo', currentLanguage)}</button>
        `);
    }

    if (isOwner) {
        const respostaId = resposta.id;
        const dropdownId = `dropdown-resposta-${respostaId}`;
        metaActions.push(`
            <div class="options-dropdown-container">
                <button
                    type="button"
                    class="options-dropdown-btn"
                    data-dropdown-id="${dropdownId}"
                    title="Opções"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="12" cy="5" r="1"/>
                        <circle cx="12" cy="19" r="1"/>
                    </svg>
                </button>
                <div class="options-dropdown-menu hidden" id="${dropdownId}">
                    <button type="button" class="dropdown-item" data-action="delete" data-delete-type="resposta" data-id="${respostaId}" data-assunto-id="${assuntoId}"${isStatus ? ` data-status-id="${assuntoId}"` : ''}>
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `);
    }

    const metaActionsHtml = metaActions.length
        ? `<div class="reply-meta-actions">${metaActions.join('')}</div>`
        : '';

    return `
        <div class="reply-item" data-resposta-id="${resposta.id}">
            ${avatarMarkup}
            <div class="reply-body">
    <div class="reply-meta">
        <span class="reply-author">${renderProfileName(autorNome, autorUsername, 'reply-author')}</span>
        <span class="reply-time">${timeAgo(resposta.criado_em)}</span>
        ${metaActionsHtml}
    </div>
    <p class="reply-text">${formatTextWithMentions(resposta.texto)}</p>
            </div>
        </div>
    `;
            }

            function getSortedReplies(assunto) {
    return [...(assunto.respostas || [])].sort(
        (a, b) => new Date(b.criado_em) - new Date(a.criado_em)
    );
            }

            function renderReplyThread(assunto) {
    const respostas = getSortedReplies(assunto);
    const recentReplies = respostas.slice(0, 2);
    const olderReplies = respostas.slice(2);

    return `
        <div class="reply-thread">
            <form class="reply-form hidden" data-assunto-id="${assunto.id}">
    <textarea
        class="reply-input"
        placeholder="${t('placeholder.reply', currentLanguage)}"
        maxlength="280"
        rows="2"
    ></textarea>
    <div class="reply-form-actions">
        ${renderEmojiButton()}
        <button type="submit" class="btn btn-primary btn-small">${t('btn.sendReply', currentLanguage)}</button>
    </div>
            </form>
            ${recentReplies.length > 0 ? `
    <div class="reply-preview">
        <div class="reply-list">
            ${recentReplies.map(r => renderReplyItem(r, assunto.id)).join('')}
        </div>
    </div>
            ` : ''}
            <div class="assunto-replies hidden" id="replies-${assunto.id}">
    <div class="reply-list">
        ${olderReplies.length > 0
            ? olderReplies.map(r => renderReplyItem(r, assunto.id)).join('')
            : ''}
    </div>
            </div>
        </div>
    `;
            }

            async function renderAssunto(assunto) {
    const autor = typeof assunto.autor === 'object' ? assunto.autor : null;
    const profiles = typeof assunto.profiles === 'object' ? assunto.profiles : null;
    const autorInfo = autor || profiles;
    const autorNome = autorInfo?.apelido || autorInfo?.nome || assunto.autor_nome || 'Visitante';
    const autorUsername = autorInfo?.username || assunto.autor_username || '';
    const autorFoto = autorInfo?.fotos?.[0] || assunto.autor_foto || '';
    const texto = assunto.texto_pt || assunto.texto || '';
    const replyCount = assunto.respostas?.length || 0;
    let autorId = null;

    if (autorInfo?.id) {
        autorId = String(autorInfo.id);
    } else if (typeof assunto.autor === 'string') {
        autorId = assunto.autor;
    }

    const isOwner = autorId ? isContentOwner(autorId) : false;
    let roleBadge = '';
    if (autorId) {
        try {
            roleBadge = await getRoleBadge(autorId);
        } catch (error) {
            console.error('Erro ao obter role badge:', error);
            roleBadge = '';
        }
    }

    const isAdminAviso = assunto.aviso_admin;
    const canDelete = isOwner || hasAdminAccess();
    const canPin = isOwner;
    const isPinned = assunto.fixado === true;
    
    const avatarMarkup = isAdminAviso
        ? `<div class="author-avatar admin-avatar" aria-hidden="true">📢</div>`
        : (autorFoto
            ? `<img src="${autorFoto}" alt="${escapeHtml(autorNome)}" class="author-avatar avatar-clickable" data-photo-url="${autorFoto}" data-photo-alt="${escapeHtml(autorNome)}" data-username="${escapeHtml(autorUsername)}" role="button" tabindex="0">`
            : `<div class="author-avatar avatar-clickable" data-username="${escapeHtml(autorUsername)}" role="button" tabindex="0" style="background: var(--accent-subtle); display: flex; align-items: center; justify-content: center;">${escapeHtml(autorNome.charAt(0))}</div>`);

    return `
        <div class="assunto-card" data-assunto-id="${assunto.id}" data-post-url="/post/${assunto.id}">
            <div class="assunto-header">
    <div class="assunto-author">
        ${avatarMarkup}
    </div>
    <div class="assunto-content">
        <div class="assunto-top">
            ${isAdminAviso ? '' : renderProfileName(autorNome, autorUsername, 'author-name', roleBadge)}
            <div class="assunto-top-actions">
                <span class="assunto-time">${timeAgo(assunto.criado_em)}</span>
                ${renderOptionsDropdown('assunto', assunto.id, assunto.id, null, canPin, canDelete, isPinned)}
            </div>
        </div>
        <p class="assunto-text">${(function () { 
    // Processar YouTube embeds no formato [youtube:VIDEO_ID]
    const processedTexto = texto.replace(/\[youtube:([a-zA-Z0-9_-]+)\]/g, '<div class="assunto-video-wrapper"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
    
    // Processar URLs do YouTube diretas
    const ytMatch = processedTexto.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^?&]+)/);
    if (ytMatch) {
        const videoId = ytMatch[1];
        return '<div class="assunto-video-wrapper"><iframe src="https://www.youtube.com/embed/' + videoId + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
    
    return assunto.aviso_admin ? processAdminHtml(processedTexto) : formatTextWithMentions(processedTexto); 
})()}</p>
        ${assunto.poll_data ? renderPollMarkup(assunto.poll_data, assunto.poll_votes || [], assunto.id) : ''}
        ${assunto.imagem ? `<img src="${assunto.imagem}" alt="Imagem do assunto" class="assunto-image">` : ''}
    </div>
            </div>
            ${assunto.tag ? `
            <div class="assunto-tag-row">
    <button type="button" class="assunto-tag" data-tag="${escapeHtml(assunto.tag)}">${escapeHtml(getTagDisplay(assunto.tag))}</button>
            </div>
            ` : ''}
            <div class="assunto-footer">
    <div class="assunto-reactions">
        ${renderReactionButtons(assunto.id, assunto.reactions, 'assunto')}
    </div>
    <button type="button" class="assunto-action-btn btn-reply" data-assunto-id="${assunto.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span>${replyCount}</span>
    </button>
            </div>
            ${renderReplyThread(assunto)}
        </div>
    `;
            }

            async function createAssuntoCard(assunto, userProfile = null) {
    return await renderAssunto(assunto);
            }

            async function createStatusCard(status) {
    const profile = status.profiles || {};
    const autorNome = profile.apelido || profile.nome || 'Visitante';
    const autorFoto = profile.fotos?.[0] || '';
    const autorUsername = profile.username || '';
    const isOwner = currentUser && currentUser.id === status.user_id;
    const roleBadge = await getRoleBadge(status.user_id);

    const avatarMarkup = autorFoto
        ? `<img src="${autorFoto}" alt="${escapeHtml(autorNome)}" class="author-avatar avatar-clickable" data-photo-url="${autorFoto}" data-photo-alt="${escapeHtml(autorNome)}" data-username="${escapeHtml(autorUsername)}" role="button" tabindex="0">`
        : `<div class="author-avatar avatar-clickable" data-username="${escapeHtml(autorUsername)}" role="button" tabindex="0" style="background: var(--accent-subtle); display: flex; align-items: center; justify-content: center;">${escapeHtml(autorNome.charAt(0))}</div>`;

    const statusAction = statusTypeLabels[status.type] || status.type;

    // Converter respostas do status para o formato esperado por renderReplyItem
    const respostas = (status.comments || []).map(comment => {
        // Se o comentário já tem profiles do JOIN, usar isso
        if (comment.profiles) {
            return {
                id: comment.id,
                texto: comment.texto,
                criado_em: comment.criado_em,
                autor: comment.profiles
            };
        }
        // Caso contrário, usar o autor direto
        return {
            id: comment.id,
            texto: comment.texto,
            criado_em: comment.criado_em,
            autor: comment.autor
        };
    });

    const replyCount = respostas.length;

    return `
        <div class="assunto-card status-card" data-status-id="${status.id}" data-status-url="/status/${status.id}">
            <div class="status-card-header">
    <div class="status-card-user">
        ${avatarMarkup}
        <div>
            ${renderProfileName(autorNome, autorUsername, 'author-name', roleBadge)} está <span class="status-action-verb">${escapeHtml(statusAction)}</span>:
            <span class="assunto-time" style="display:block; font-size:11px;">${timeAgo(status.updated_at || status.created_at)}</span>
        </div>
    </div>
            </div>

            <div class="status-content-bubble">
    <span class="bubble-emoji">${status.emoji || '💬'}</span>
    <span>"${escapeHtml(status.content)}"</span>
            </div>

            <div class="status-card-actions">
    <div class="assunto-reactions">
        ${renderReactionButtons(status.id, status.reactions, 'status')}
    </div>
    <button type="button" class="assunto-action-btn btn-reply" data-status-id="${status.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span>${replyCount}</span>
    </button>
    ${isOwner ? renderOptionsDropdown('status', status.id, null, status.id, false, true, false) : ''}
            </div>

            <div class="reply-thread" id="status-replies-${status.id}">
    <form class="reply-form hidden" data-status-id="${status.id}">
        <textarea
            class="reply-input"
            placeholder="${t('placeholder.reply', currentLanguage)}"
            maxlength="280"
            rows="2"
        ></textarea>
        <div class="reply-form-actions">
            ${renderEmojiButton()}
            <button type="submit" class="btn btn-primary btn-small">${t('btn.sendReply', currentLanguage)}</button>
        </div>
    </form>
    ${respostas && respostas.length > 0 ? `
        <div class="reply-preview">
            <div class="reply-list">
                ${respostas.slice(0, 2).map(r => renderReplyItem(r, status.id, true)).join('')}
            </div>
        </div>
    ` : ''}
    <div class="assunto-replies hidden" id="status-older-replies-${status.id}">
        <div class="reply-list">
            ${respostas.length > 2
            ? respostas.slice(2).map(r => renderReplyItem(r, status.id, true)).join('')
            : ''}
        </div>
    </div>
            </div>
        </div>
    `;
            }

            async function renderFeed(assuntos, containerId = 'feed-content') {
    const feedContent = document.getElementById(containerId);

    if (!feedContent) return;

    if (!assuntos || assuntos.length === 0) {
        feedContent.innerHTML = '<p class="feed-empty">Nenhum assunto encontrado. Seja o primeiro a postar!</p>';
        return;
    }

    const cards = await Promise.all(assuntos.map(assunto => {
        return createAssuntoCard(assunto);
    }));

    feedContent.innerHTML = cards.join('');
            }

            async function renderMixedFeed(feedItems) {
    const feedContent = document.getElementById('feed-content');

    if (!feedItems || feedItems.length === 0) {
        feedContent.innerHTML = '<p class="feed-empty">Nenhum assunto encontrado. Seja o primeiro a postar!</p>';
        return;
    }

    const cards = await Promise.all(feedItems.map(item => {
        if (item.type === 'status') {
            return createStatusCard(item.data);
        } else {
            return createAssuntoCard(item.data);
        }
    }));

    feedContent.innerHTML = cards.join('');
            }

            async function handleReaction(itemId, emoji, itemType = 'assunto') {
    if (!supabase) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    if (!currentUser) {
        alert(t('error.loginToReact', currentLanguage));
        return;
    }

    try {
        const columnName = itemType === 'status' ? 'status' : 'assunto';

        const { data: existing, error: fetchError } = await supabase
            .from('reactions')
            .select('id, emoji')
            .eq(columnName, itemId)
            .eq('autor', currentUser.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            if (existing.emoji === emoji) {
                const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('reactions')
                    .update({ emoji })
                    .eq('id', existing.id);
                if (error) throw error;
            }
        } else {
            const { error } = await supabase.from('reactions').insert({
                [columnName]: itemId,
                autor: currentUser.id,
                emoji
            });
            if (error) throw error;
        }

        await loadFeed();
    } catch (error) {
        console.error('Erro ao reagir:', error);
        alert('Erro ao reagir: ' + (error.message || 'tente novamente.'));
    }
            }

            function toggleRepliesPanel(itemId, sourceElement = null, itemType = 'assunto') {
    const cardClass = itemType === 'status' ? '.status-card' : '.assunto-card';
    const card = sourceElement?.closest(cardClass);
    if (!card) return;

    const replyThread = card?.querySelector('.reply-thread');
    if (!replyThread) return;

    const form = replyThread.querySelector('.reply-form');
    const olderReplies = replyThread.querySelector('.assunto-replies');

    const isFormHidden = form?.classList.contains('hidden');
    const isOlderRepliesHidden = olderReplies?.classList.contains('hidden');

    if (isFormHidden && isOlderRepliesHidden) {
        // Mostrar tudo (formulário e respostas antigas)
        if (form) form.classList.remove('hidden');
        if (olderReplies) olderReplies.classList.remove('hidden');
        const input = form?.querySelector('.reply-input');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    } else {
        // Esconder tudo
        if (form) form.classList.add('hidden');
        if (olderReplies) olderReplies.classList.add('hidden');
    }
            }

            async function submitReply(itemId, texto, itemType = 'assunto') {
    if (!supabase) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    if (!currentUser) {
        alert(t('error.loginToReplyStatus', currentLanguage));
        return;
    }

    const trimmed = texto.trim();
    if (!trimmed) return;

    try {
        let autorId = null;

        if (itemType === 'assunto') {
            const { data: assunto, error: assuntoError } = await supabase
                .from('assuntos')
                .select('autor')
                .eq('id', itemId)
                .single();

            if (assuntoError) throw assuntoError;
            autorId = assunto?.autor;
        } else {
            // Para status, precisamos buscar o user_id da tabela user_status
            const { data: status, error: statusError } = await supabase
                .from('user_status')
                .select('user_id')
                .eq('id', itemId)
                .single();

            if (statusError) throw statusError;
            autorId = status?.user_id;
        }

        const columnName = itemType === 'status' ? 'status' : 'assunto';

        const { data, error } = await supabase
            .from('respostas')
            .insert({
                [columnName]: itemId,
                autor: currentUser.id,
                texto: trimmed
            })
            .select('id')
            .single();

        if (error) throw error;

        const skipIds = autorId ? [autorId] : [];
        await notifyMentions(trimmed, itemId, data.id, skipIds, itemType);

        await loadFeed();
    } catch (error) {
        console.error('Erro ao responder:', error);
        alert('Erro ao responder: ' + (error.message || 'tente novamente.'));
    }
            }

            async function deleteAssunto(assuntoId) {
    if (!supabase || !currentUser) return;

    if (!confirm(t('confirm.deleteAssunto', currentLanguage))) return;

    try {
        // Verificar se o assunto é um aviso do administrador
        const { data: assunto, error: fetchError } = await supabase
            .from('assuntos')
            .select('aviso_admin, autor')
            .eq('id', assuntoId)
            .single();

        if (fetchError) throw fetchError;

        // Se não for dono e não for admin, impedir exclusão
        if (assunto?.autor !== currentUser.id && !hasAdminAccess()) {
            alert('Você não tem permissão para excluir este assunto.');
            return;
        }

        // Usar função RPC para deletar assunto e imagem
        const { error } = await supabase.rpc('delete_assunto_with_image', {
            assunto_id: assuntoId
        });

        if (error) throw error;

        await loadFeed();
    } catch (error) {
        console.error('Erro ao excluir assunto:', error);
        alert('Erro ao excluir assunto: ' + (error.message || 'tente novamente.'));
    }
            }

            async function deleteResposta(respostaId, assuntoId) {
    if (!supabase || !currentUser) return;

    if (!confirm(t('confirm.deleteResposta', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('respostas')
            .delete()
            .eq('id', respostaId);

        if (error) throw error;

        await loadFeed();
    } catch (error) {
        console.error('Erro ao excluir resposta:', error);
        alert('Erro ao excluir resposta: ' + (error.message || 'tente novamente.'));
    }
            }

            async function handleDeleteStatusComment(commentId) {
    if (!supabase || !currentUser) return;

    if (!confirm(t('confirm.deleteResposta', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('status_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;

        await loadFeed();
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        alert('Erro ao excluir comentário: ' + (error.message || 'tente novamente.'));
    }
            }

            function handleReplyToUser(assuntoId, username, sourceElement = null) {
    if (!username) return;

    const card = sourceElement?.closest('.assunto-card');
    const form = card?.querySelector('.reply-form');
    if (!form) return;

    form.classList.remove('hidden');
    const input = form.querySelector('.reply-input');
    if (input) {
        const mention = username.startsWith('@') ? username : `@${username}`;
        input.value = `${mention} `;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
            }

            function handleFeedInteraction(e) {
    // Fechar todos os dropdowns ao clicar fora
    if (!e.target.closest('.options-dropdown-container')) {
        document.querySelectorAll('.options-dropdown-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    const dropdownBtn = e.target.closest('.options-dropdown-btn');
    if (dropdownBtn) {
        e.preventDefault();
        e.stopPropagation();
        const dropdownId = dropdownBtn.dataset.dropdownId;
        const dropdownMenu = document.getElementById(dropdownId);
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('hidden');
        }
        return;
    }

    const dropdownItem = e.target.closest('.dropdown-item');
    if (dropdownItem) {
        e.preventDefault();
        e.stopPropagation();
        const action = dropdownItem.dataset.action;
        
        if (action === 'delete') {
            const { deleteType, id, assuntoId, statusId } = dropdownItem.dataset;
            if (deleteType === 'assunto') {
                deleteAssunto(id);
            } else if (deleteType === 'status') {
                deleteStatusFromFeed(id);
            } else if (deleteType === 'resposta') {
                if (statusId) {
                    handleDeleteStatusComment(id);
                } else {
                    deleteResposta(id, assuntoId);
                }
            }
        } else if (action === 'pin') {
            const assuntoId = dropdownItem.dataset.assuntoId;
            const isPinned = dropdownItem.textContent.includes('Desfixar');
            handlePinAssunto(assuntoId, isPinned);
        } else if (action === 'report') {
            alert('Funcionalidade de denúncia em breve!');
        }
        
        // Fechar o dropdown após clicar
        dropdownItem.closest('.options-dropdown-menu').classList.add('hidden');
        return;
    }

    const avatarTrigger = e.target.closest('.avatar-clickable');
    if (avatarTrigger && avatarTrigger.dataset.username) {
        e.preventDefault();
        goToProfile(avatarTrigger.dataset.username);
        return;
    }

    if (avatarTrigger) {
        e.preventDefault();
        openPhotoModal(avatarTrigger.dataset.photoUrl, avatarTrigger.dataset.photoAlt);
        return;
    }

    const visitorBtn = e.target.closest('.visitor-name-button');
    if (visitorBtn && visitorBtn.dataset.username) {
        e.preventDefault();
        goToProfile(visitorBtn.dataset.username);
        return;
    }

    const reactionBtn = e.target.closest('.reaction-btn');
    if (reactionBtn) {
        e.preventDefault();
        const itemId = reactionBtn.dataset.assuntoId || reactionBtn.dataset.statusId;
        const itemType = reactionBtn.dataset.itemType || 'assunto';
        handleReaction(itemId, reactionBtn.dataset.emoji, itemType);
        return;
    }

    const pollButton = e.target.closest('.poll-vote-btn');
    if (pollButton) {
        e.preventDefault();
        const assuntoCard = pollButton.closest('.assunto-card');
        const assuntoId = assuntoCard?.dataset.assuntoId;
        const optionIndex = Number(pollButton.dataset.pollIndex);
        if (assuntoId && !Number.isNaN(optionIndex)) {
            votePoll(assuntoId, optionIndex, pollButton);
        }
        return;
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        e.preventDefault();
        const { deleteType, id, assuntoId, statusId } = deleteBtn.dataset;

        if (deleteType === 'assunto') {
            deleteAssunto(id);
        } else if (deleteType === 'status') {
            deleteStatusFromFeed(id);
        } else if (deleteType === 'resposta') {
            if (statusId) {
                handleDeleteStatusComment(id);
            } else {
                deleteResposta(id, assuntoId);
            }
        }
        return;
    }

    const pinBtn = e.target.closest('.pin-btn');
    if (pinBtn) {
        e.preventDefault();
        const assuntoId = pinBtn.dataset.assuntoId;
        const isPinned = pinBtn.classList.contains('pinned');
        handlePinAssunto(assuntoId, isPinned);
        return;
    }

    const replyToBtn = e.target.closest('.reply-to-btn');
    if (replyToBtn) {
        e.preventDefault();
        handleReplyToUser(replyToBtn.dataset.assuntoId, replyToBtn.dataset.username, replyToBtn);
        return;
    }

    const replyToggle = e.target.closest('.reply-toggle-btn');
    if (replyToggle) {
        e.preventDefault();
        const itemId = replyToggle.dataset.assuntoId || replyToggle.dataset.statusId;
        const itemType = replyToggle.dataset.statusId ? 'status' : 'assunto';
        toggleRepliesPanel(itemId, replyToggle, itemType);
        return;
    }

    const statusCommentToggle = e.target.closest('.status-comment-toggle-btn');
    if (statusCommentToggle) {
        e.preventDefault();
        const statusId = statusCommentToggle.dataset.statusId;
        toggleStatusCommentsPanel(statusId);
        return;
    }

    const mention = e.target.closest('.mention');
    if (mention && mention.dataset.username) {
        e.preventDefault();
        goToProfile(mention.dataset.username);
        return;
    }
            }

            async function handlePinAssunto(assuntoId, isPinned) {
    if (!supabase || !currentUser || !pinAssunto || !unpinAssunto) {
        console.error('Supabase ou funções de pin não disponíveis');
        return;
    }

    try {
        if (isPinned) {
            // Desfixar
            const result = await unpinAssunto(assuntoId, currentUser.id);
            if (result.success) {
                console.log('Assunto desfixado com sucesso');
                // Atualizar UI
                await loadPinnedAssuntos(currentUser.id);
                await loadFeed();
            } else {
                alert('Erro ao desfixar assunto: ' + result.error.message);
            }
        } else {
            // Fixar
            const result = await pinAssunto(assuntoId, currentUser.id);
            if (result.success) {
                console.log('Assunto fixado com sucesso');
                // Atualizar UI
                await loadPinnedAssuntos(currentUser.id);
                await loadFeed();
            } else {
                alert(t('error.pinAssunto', currentLanguage) + result.error.message);
            }
        }
    } catch (error) {
        console.error('Erro ao processar ação de fixar:', error);
        alert(t('error.processPinAction', currentLanguage) + error.message);
    }
            }

            async function deleteStatusFromFeed(statusId) {
    if (!supabase || !currentUser) return;
    if (!confirm(t('confirm.deleteStatus', currentLanguage))) return;
    try {
        const { error } = await supabase.from('user_status').delete().eq('id', statusId).eq('user_id', currentUser.id);
        if (error) throw error;
        await loadFeed();
        if (currentUser) await loadUserStatuses(currentUser.id);
    } catch (err) {
        console.error('Erro ao deletar status:', err);
    }
            }

            async function toggleStatusCommentsPanel(statusId) {
    const section = document.getElementById(`status-comments-${statusId}`);
    if (!section) return;

    const isHidden = section.classList.contains('hidden');
    section.classList.toggle('hidden', !isHidden);

    if (isHidden) {
        await loadStatusComments(statusId);
    }
            }

            async function loadStatusComments(statusId) {
    const container = document.getElementById(`status-comments-list-${statusId}`);
    if (!container) return;

    try {
        const comments = getStatusComments ? await getStatusComments(statusId) : [];
        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="reply-empty" style="padding:8px 0; font-size:12px; color:var(--text-muted);">Nenhuma resposta ainda. Seja o primeiro!</p>';
            return;
        }

        container.innerHTML = comments.map(comment => {
            const author = comment.profiles || {};
            const autorNome = author.apelido || author.nome || 'Visitante';
            const autorFoto = author.fotos?.[0] || '';
            const autorUsername = author.username || '';
            const avatarMarkup = autorFoto
                ? `<img src="${autorFoto}" class="reply-avatar">`
                : `<div class="reply-avatar reply-avatar-placeholder">${escapeHtml(autorNome.charAt(0))}</div>`;

            return `
    <div class="reply-item">
        ${avatarMarkup}
        <div class="reply-body">
            <div class="reply-meta">
                <span class="reply-author">${renderProfileName(autorNome, autorUsername, 'reply-author')}</span>
                <span class="reply-time">${timeAgo(comment.criado_em || comment.created_at)}</span>
            </div>
            <p class="reply-text">${escapeHtml(comment.texto || comment.content || '')}</p>
        </div>
    </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Erro ao carregar comentários do status:', err);
        container.innerHTML = '<p class="reply-empty">' + t('replies.errorLoad', currentLanguage) + '</p>';
    }
            }

            async function submitStatusComment(statusId, content) {
    if (!currentUser) {
        alert(t('error.loginToReplyStatus', currentLanguage));
        return;
    }

    try {
        if (addStatusComment) {
            await addStatusComment(statusId, currentUser.id, content);
            await loadFeed();
        }
    } catch (err) {
        console.error('Erro ao enviar comentário:', err);
    }
            }

            function handleFeedSubmit(e) {
    const statusForm = e.target.closest('.status-comment-form');
    if (statusForm) {
        e.preventDefault();
        const statusId = statusForm.dataset.statusId;
        const input = statusForm.querySelector('.status-comment-input');
        if (input && input.value.trim()) {
            submitStatusComment(statusId, input.value.trim());
            input.value = '';
        }
        return;
    }

    const form = e.target.closest('.reply-form');
    if (!form) return;

    e.preventDefault();
    const input = form.querySelector('.reply-input');
    const assuntoId = form.dataset.assuntoId;
    const statusId = form.dataset.statusId;

    if (statusId) {
        // Para status, usar a função específica de comentário
        if (input && input.value.trim()) {
            submitStatusComment(statusId, input.value.trim());
            input.value = '';
        }
    } else if (assuntoId) {
        // Para assuntos, usar a função de resposta
        submitReply(assuntoId, input?.value || '', 'assunto');
    }
            }

            // Formatar tempo relativo
            function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

    return date.toLocaleDateString();
            }

            // Carregar dados do perfil
            function loadProfileData() {
    if (!currentProfile) return;

    const profileApelido = document.getElementById('profile-apelido');
    if (profileApelido) profileApelido.value = currentProfile.apelido || '';
    
    const profileNome = document.getElementById('profile-nome');
    if (profileNome) profileNome.value = currentProfile.nome || '';
    
    document.getElementById('profile-username').value = currentProfile.username || '';
    document.getElementById('profile-email').value = currentUser?.email || '';
    
    const showName = document.getElementById('show-name');
    if (showName) showName.checked = currentProfile.show_name !== false;

    // Carregar campos do perfil
    document.getElementById('profile-bio').value = currentProfile.bio || '';
    document.getElementById('profile-local').value = currentProfile.local || '';
    document.getElementById('profile-data-nascimento').value = currentProfile.data_nascimento || '';
    document.getElementById('profile-genero').value = currentProfile.pronomes || '';
    document.getElementById('profile-sexualidade').value = currentProfile.sexualidade || '';
    // document.getElementById('profile-mbti').value = currentProfile.mbti || ''; // Campo manual não usado mais
    document.getElementById('profile-site').value = currentProfile.site_url || '';
    document.getElementById('profile-soundcloud').value = currentProfile.soundcloud_url || '';

    // Carregar checkboxes de visibilidade

    // Carregar checkboxes de visibilidade
    const showBio = document.getElementById('show-bio');
    if (showBio) showBio.checked = currentProfile.show_bio !== false;

    const showLocal = document.getElementById('show-local');
    if (showLocal) showLocal.checked = currentProfile.show_local !== false;

    const showIdade = document.getElementById('show-idade');
    if (showIdade) showIdade.checked = currentProfile.show_idade !== false;

    const showPronomes = document.getElementById('show-pronomes');
    if (showPronomes) showPronomes.checked = currentProfile.show_pronomes !== false;

    const showSexualidade = document.getElementById('show-sexualidade');
    if (showSexualidade) showSexualidade.checked = currentProfile.show_sexualidade !== false;

    const showMbti = document.getElementById('show-mbti');
    if (showMbti) showMbti.checked = currentProfile.show_mbti !== false;

    const showSite = document.getElementById('show-site');
    if (showSite) showSite.checked = currentProfile.show_site !== false;

    // Carregar fontes personalizadas
    const fontTitle = document.getElementById('font-title');
    if (fontTitle) fontTitle.value = currentProfile.font_title || '';

    const fontBody = document.getElementById('font-body');
    if (fontBody) fontBody.value = currentProfile.font_body || '';

    // Carregar tamanho do apelido
    const apelidoFontSize = document.getElementById('apelido-font-size');
    const apelidoFontSizeValue = document.getElementById('apelido-font-size-value');
    if (apelidoFontSize) apelidoFontSize.value = currentProfile.apelido_font_size || 48;
    if (apelidoFontSizeValue) apelidoFontSizeValue.textContent = `${currentProfile.apelido_font_size || 48}px`;

    // Carregar tamanho da fonte geral
    const bodyFontSize = document.getElementById('body-font-size');
    const bodyFontSizeValue = document.getElementById('body-font-size-value');
    if (bodyFontSize) bodyFontSize.value = currentProfile.body_font_size || 13;
    if (bodyFontSizeValue) bodyFontSizeValue.textContent = `${currentProfile.body_font_size || 13}px`;

    // Atualizar preview de fontes
    updateFontPreview();

    // Atualizar mostrário do perfil em tempo real
    updateSettingsProfilePreview();

    // Aplicar fontes ao cantinho pessoal
    applyUserFonts(currentProfile);

    // Carregar configurações de plano de fundo
    if (currentProfile.bg_type) {
        const bgTypeRadio = document.querySelector(`input[name="bg-type"][value="${currentProfile.bg_type}"]`);
        if (bgTypeRadio) {
            bgTypeRadio.checked = true;
            // Disparar evento change para atualizar a UI (mostrar color picker ou image upload)
            bgTypeRadio.dispatchEvent(new Event('change'));
        }
    } else {
        const bgTypeNone = document.querySelector('input[name="bg-type"][value="none"]');
        if (bgTypeNone) {
            bgTypeNone.checked = true;
            bgTypeNone.dispatchEvent(new Event('change'));
        }
    }
    
    if (currentProfile.bg_color) {
        const bgColorInput = document.getElementById('bg-color');
        if (bgColorInput) {
            bgColorInput.value = currentProfile.bg_color;
        }
    }
            }

            // Carregar perfil público
            async function loadPublicProfile(username) {
    if (!supabase) {
        console.error('Supabase não está configurado');
        return;
    }

    try {
        // Normalizar o username removendo o @ inicial
        const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
        
        // Buscar perfil pelo username normalizado
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', normalizedUsername)
            .single();

        if (error) throw error;
        if (!profile) {
            alert('Perfil não encontrado');
            showFeedView();
            return;
        }

        // Usar o novo componente para atualizar o card de perfil público
        updatePublicProfileCard(profile);

        // Atualizar username separadamente (não está no componente)
        const profileUsername = document.getElementById('public-profile-username');
        if (profileUsername) profileUsername.textContent = profile.username || '@usuario';

        // Atualizar bio com aspas (formato específico)
        const profileBio = document.getElementById('public-profile-bio');
        if (profileBio) profileBio.textContent = profile.bio ? `"${profile.bio}"` : '"Sem bio"';

        const profileSite = document.getElementById('public-profile-site');
        if (profileSite) {
            if (profile.site_url) {
                profileSite.href = profile.site_url;
                profileSite.target = '_blank';
                profileSite.rel = 'noopener';
                profileSite.title = profile.site_url;
                profileSite.style.display = 'inline-block';
            } else {
                profileSite.style.display = 'none';
            }
        }

        // Carregar player de música se tiver SoundCloud
        if (profile.soundcloud_url) {
            await loadProfileMusic(profile, 'public-profile-music-player-card');
        }

        const profileAvatar = document.getElementById('public-profile-avatar');
        if (profileAvatar) {
            if (profile.fotos && profile.fotos.length > 0) {
                profileAvatar.src = profile.fotos[0];
            } else {
                const initials = profile.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || profile.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
                profileAvatar.src = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#D4C4A8"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="80" fill="#4A7C59" font-family="Arial">${initials}</text>
        </svg>
    `)}`;
            }
        }

        // Carregar postagens do usuário
        await loadUserPosts(profile.id);

        // Carregar assuntos fixados
        await loadPinnedAssuntos(profile.id);

        // Atualizar o item de navegação do cantinho do dono no header
        const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
        const cantinhoDonoLabel = document.getElementById('cantinho-dono-label');
        if (navItemCantinhoDono && cantinhoDonoLabel) {
            navItemCantinhoDono.classList.remove('hidden');
            cantinhoDonoLabel.textContent = profile.username || profile.apelido || 'Visitante';
            // Atualizar o href para apontar para o perfil público correto
            navItemCantinhoDono.href = `#/profile/${profile.username || profile.apelido}`;
            // Remover o comportamento padrão e adicionar event listener
            navItemCantinhoDono.onclick = (e) => {
                e.preventDefault();
                window.location.hash = `/profile/${profile.username || profile.apelido}`;
            };
        }

    } catch (error) {
        console.error('Erro ao carregar perfil público:', error);
        alert(t('profile.errorLoad', currentLanguage));
        showFeedView();
    }
            }

            // Carregar postagens do usuário
            async function loadUserPosts(userId) {
    if (!supabase) return;

    try {
        const { data: posts, error } = await supabase
            .from('assuntos')
            .select('*')
            .eq('autor', userId)
            .order('criado_em', { ascending: false });

        if (error) throw error;

        const feedContent = document.getElementById('public-profile-feed-content');
        if (!feedContent) return;

        if (posts.length === 0) {
            feedContent.innerHTML = '<p>Nenhuma postagem ainda.</p>';
            return;
        }

        // Renderizar postagens (reutilizar função existente se possível)
        await renderFeed(posts, 'public-profile-feed-content');

    } catch (error) {
        console.error('Erro ao carregar postagens:', error);
    }
            }

            // Mostrar view de perfil público
            function showPublicProfileView(username) {
    console.log('showPublicProfileView called with username:', username);
    hideAllViews();
    const publicProfileView = document.getElementById('public-profile-view');
    if (publicProfileView) {
        publicProfileView.classList.remove('hidden');
    } else {
        console.error('public-profile-view element not found');
    }
    loadPublicProfile(username);

    // Atualizar navegação do header
    updateHeaderNavigation();
            }

            // Esconder todas as views
            function hideAllViews() {
    const views = ['feed-view', 'settings-view', 'cantinho-view', 'public-profile-view', 'admin-view'];
    views.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) view.classList.add('hidden');
    });
    // Resetar padding do main-content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.padding = '';
    }
            }

            // Aplicar background personalizado
            function applyBackground(profile) {
    const body = document.body;

    // Limpar todos os estilos de background primeiro
    body.style.background = '';
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundAttachment = '';

    if (!profile || !profile.bg_type) {
        // Usar background padrão (já limpo acima)
        return;
    }

    if (profile.bg_type === 'color' && profile.bg_color) {
        body.style.background = profile.bg_color;
    } else if (profile.bg_type === 'image' && profile.bg_image) {
        body.style.backgroundImage = `url(${profile.bg_image})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
    }
    // Se bg_type existe mas não é 'color' nem 'image', ou se os valores estão vazios,
    // usa o background padrão (já limpo acima)
            }

            // Gerar HTML da badge de role (admin/mod)
            async function getRoleBadge(userId) {
    if (!userId || typeof userId !== 'string') {
        console.error('getRoleBadge: userId inválido:', userId);
        return '';
    }

    const { getUserRole } = await import('./supabase-client.js');
    const role = await getUserRole(userId);

    if (role === 'admin') {
        return '<span class="role-badge admin" data-tooltip="Administrador">👑</span>';
    } else if (role === 'moderator') {
        return '<span class="role-badge mod" data-tooltip="Moderador">⭐</span>';
    }
    return '';
            }

            // Carregar avatar do usuário no header
            function loadUserAvatar() {
    const avatarImg = document.getElementById('header-avatar-img');
    const headerUsername = document.getElementById('header-username-text');
    const footerCreatorNames = document.querySelectorAll('.footer-creator-name');

    // Usar o novo componente para atualizar o card de perfil do feed
    if (currentProfile) {
        updateFeedProfileCard(currentProfile);

        // Atualizar avatar do header separadamente
        let avatarUrl = '';
        if (currentProfile.fotos && currentProfile.fotos.length > 0) {
            avatarUrl = currentProfile.fotos[0];
        } else {
            const initials = currentProfile?.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || currentProfile?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
            avatarUrl = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <rect width="40" height="40" fill="#D4C4A8"/>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="#4A7C59" font-family="Arial">${initials}</text>
                </svg>
            `)}`;
        }

        if (avatarImg) avatarImg.src = avatarUrl;
        if (headerUsername) headerUsername.textContent = currentProfile.apelido || currentProfile.nome || 'Visitante';

        // Carregar fotos do usuário no feed
        if (currentUser) {
            loadUserPhotos(currentUser.id);
        }

        // Atualizar footer com nome do criador
        footerCreatorNames.forEach(el => {
            if (el) el.textContent = currentProfile.apelido || currentProfile.nome || 'Visitante';
        });
    }
}

            // Comprimir imagem usando Canvas
            function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calcular proporção para redimensionar
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Converter para WebP com qualidade especificada
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/webp', quality);
        };

        reader.readAsDataURL(file);
    });
}

// Handle atualização de conta (email, senha, username)
async function handleAccountUpdate(e) {
    e.preventDefault();

    if (!supabase) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    const currentPassword = document.getElementById('profile-current-password').value;
    const profileNome = document.getElementById('profile-nome');
    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;
    const newPassword = document.getElementById('profile-new-password').value;

    // Verificar senha atual antes de qualquer alteração
    if (!currentPassword) {
        alert(t('error.currentPasswordRequiredConfirm', currentLanguage));
        return;
    }

    try {
        // Verificar senha atual re-autenticando
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });

        if (signInError) {
            alert(t('error.wrongPasswordConfirm', currentLanguage));
            return;
        }
    } catch (error) {
        alert(t('error.verifyPassword', currentLanguage));
        return;
    }

    // Validar username se foi alterado
    if (username !== currentProfile.username) {
        if (!validateUsername(username)) {
            alert(t('error.usernameFormat', currentLanguage));
            return;
        }

        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            alert(t('error.usernameExists', currentLanguage));
            return;
        }
    }

    try {
        // Atualizar email se foi alterado
        if (email !== currentUser.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: email
            });

            if (emailError) throw emailError;

            alert('Email atualizado! Verifique sua caixa de entrada para confirmar.');
        }

        // Atualizar senha se foi fornecida
        if (newPassword) {
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (passwordError) throw passwordError;
        }

        // Atualizar perfil no banco
        const profileData = {
            username: username,
            idioma: currentLanguage
        };

        // Adicionar nome se fornecido
        if (profileNome && profileNome.value) {
            profileData.nome = profileNome.value;
        }

        const showName = document.getElementById('show-name');
        if (showName) profileData.show_name = showName.checked;

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', currentUser.id);

        if (profileError) throw profileError;

        // Recarregar dados do perfil
        currentProfile = await getUserProfile(currentUser.id);
        loadUserAvatar();

        // Limpar campo de senha
        document.getElementById('profile-current-password').value = '';
        document.getElementById('profile-new-password').value = '';

        alert(t('success.changesSaved', currentLanguage));
    } catch (error) {
        console.error('Erro ao atualizar conta:', error);
        alert(t('error.saveChanges', currentLanguage));
    }
}

// Handle atualização de perfil (sem verificação de senha)
async function handleProfileUpdate(e) {
    e.preventDefault();

    if (!supabase) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    const profileApelido = document.getElementById('profile-apelido');
    const profileNome = document.getElementById('profile-nome');
    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;
    const newPassword = document.getElementById('profile-new-password').value;

    // Validar username se foi alterado
    if (username !== currentProfile.username) {
        if (!validateUsername(username)) {
            alert(t('error.usernameFormat', currentLanguage));
            return;
        }

        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            alert(t('error.usernameExists', currentLanguage));
            return;
        }
    }

    try {
        // Atualizar perfil no banco
        const profileData = {
            username: username,
            idioma: currentLanguage
        };

        // Adicionar apelido se fornecido
        if (profileApelido && profileApelido.value) {
            profileData.apelido = profileApelido.value;
        }

        // Adicionar nome se fornecido
        if (profileNome && profileNome.value) {
            profileData.nome = profileNome.value;
        }

        // Adicionar campos do perfil se existirem no formulário
        const bio = document.getElementById('profile-bio');
        if (bio) profileData.bio = bio.value;

        const local = document.getElementById('profile-local');
        if (local) profileData.local = local.value;

        const dataNascimento = document.getElementById('profile-data-nascimento');
        if (dataNascimento) profileData.data_nascimento = dataNascimento.value;

        const pronomes = document.getElementById('profile-genero');
        if (pronomes) profileData.pronomes = pronomes.value;

        const sexualidade = document.getElementById('profile-sexualidade');
        if (sexualidade) profileData.sexualidade = sexualidade.value;

        const mbti = document.getElementById('profile-mbti');
        if (mbti) profileData.mbti = mbti.value;

        const site = document.getElementById('profile-site');
        if (site) profileData.site_url = site.value;

        const soundcloud = document.getElementById('profile-soundcloud');
        if (soundcloud) profileData.soundcloud_url = soundcloud.value;

        // Adicionar checkboxes de visibilidade
        const showBio = document.getElementById('show-bio');
        if (showBio) profileData.show_bio = showBio.checked;

        const showLocal = document.getElementById('show-local');
        if (showLocal) profileData.show_local = showLocal.checked;

        const showIdade = document.getElementById('show-idade');
        if (showIdade) profileData.show_idade = showIdade.checked;

        const showPronomes = document.getElementById('show-pronomes');
        if (showPronomes) profileData.show_pronomes = showPronomes.checked;

        const showSexualidade = document.getElementById('show-sexualidade');
        if (showSexualidade) profileData.show_sexualidade = showSexualidade.checked;

        const showMbti = document.getElementById('show-mbti');
        if (showMbti) profileData.show_mbti = showMbti.checked;

        const showSite = document.getElementById('show-site');
        if (showSite) profileData.show_site = showSite.checked;

        const showName = document.getElementById('show-name');
        if (showName) profileData.show_name = showName.checked;

        // Adicionar fontes personalizadas
        const fontTitle = document.getElementById('font-title');
        const fontBody = document.getElementById('font-body');
        if (fontTitle) profileData.font_title = fontTitle.value || null;
        if (fontBody) profileData.font_body = fontBody.value || null;

        // Adicionar tamanho do apelido
        const apelidoFontSize = document.getElementById('apelido-font-size');
        if (apelidoFontSize) profileData.apelido_font_size = parseInt(apelidoFontSize.value) || 48;

        // Adicionar tamanho da fonte geral
        const bodyFontSize = document.getElementById('body-font-size');
        if (bodyFontSize) profileData.body_font_size = parseInt(bodyFontSize.value) || 13;

        console.log('Dados do perfil a serem atualizados:', profileData);

        // Validar mínimo de 4 campos ativos
        const activeFields = [
            showBio?.checked,
            showLocal?.checked,
            showIdade?.checked,
            showPronomes?.checked,
            showSexualidade?.checked,
            showMbti?.checked,
            showSite?.checked
        ].filter(Boolean).length;

        if (activeFields < 4) {
            alert('Você precisa mostrar pelo menos 4 campos no seu widget.');
            return;
        }

        // Adicionar configurações de plano de fundo
        const bgType = document.querySelector('input[name="bg-type"]:checked')?.value;
        if (bgType && bgType !== 'none') {
            profileData.bg_type = bgType;

            if (bgType === 'color') {
                const bgColor = document.getElementById('bg-color')?.value;
                if (bgColor) profileData.bg_color = bgColor;
            } else if (bgType === 'image') {
                const bgImage = document.getElementById('bg-image')?.value;
                if (bgImage) profileData.bg_image = bgImage;
            }
        } else {
            profileData.bg_type = null;
            profileData.bg_color = null;
            profileData.bg_image = null;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', currentUser.id);

        if (profileError) throw profileError;

        // Recarregar dados do perfil
        currentProfile = await getUserProfile(currentUser.id);
        loadUserAvatar();

        // Aplicar fontes personalizadas
        applyUserFonts(currentProfile);

        // Recarregar player de música se tiver SoundCloud
        if (currentProfile.soundcloud_url) {
            await loadProfileMusic(currentProfile);
        }

        alert('Perfil atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        console.error('Detalhes do erro:', error.message, error.details);
        alert('Erro ao salvar alterações: ' + (error.message || 'Tente novamente.'));
    }
}

// Ir para Configurações
function goToSettings() {
    if (mainScreen.classList.contains('hidden')) {
        showScreen('main');
    }
    window.location.hash = '#/settings';

    // Configurar seção de MBTI após carregar as configurações
    setTimeout(() => {
        if (typeof setupMBTISection === 'function') {
            setupMBTISection();
        }
    }, 100);
}

            function openAvatarUpload() {
    if (!currentUser) {
        alert('Faça login para alterar sua foto de perfil.');
        return;
    }

    const input = document.getElementById('avatar-upload-input');
    if (input) {
        input.value = '';
        input.click();
    }
            }

            function getStoragePathFromUrl(url) {
    if (!url) return null;
    const bucket = SUPABASE_CONFIG.photosBucket;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
            }

            async function deleteStoredPhoto(url) {
    const path = getStoragePathFromUrl(url);
    if (!path || !supabase) return;

    const { error } = await supabase.storage
        .from(SUPABASE_CONFIG.photosBucket)
        .remove([path]);

    if (error) console.warn('Não foi possível remover foto antiga:', error.message);
            }

            async function handleAvatarFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!supabase || !currentUser) {
        alert('Faça login para alterar sua foto de perfil.');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Selecione um arquivo de imagem (JPG, PNG, WebP ou GIF).');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('A imagem é muito grande. Escolha um arquivo de até 10 MB.');
        return;
    }

    const btn = document.getElementById('btn-edit-avatar-camera');
    if (btn) btn.disabled = true;

    try {
        const croppedBlob = await openAvatarCropModal(file);
        if (!croppedBlob) return;

        await uploadProfilePhoto(croppedBlob);
    } catch (error) {
        console.error('Erro ao enviar foto de perfil:', error);
        alert('Erro ao enviar foto de perfil: ' + (error.message || 'tente novamente.'));
    } finally {
        if (btn) btn.disabled = false;
    }
            }

            async function uploadProfilePhoto(blob) {
    const filePath = `${currentUser.id}/avatar-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
        .from(SUPABASE_CONFIG.photosBucket)
        .upload(filePath, blob, {
            contentType: 'image/webp',
            upsert: false
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_CONFIG.photosBucket)
        .getPublicUrl(filePath);

    const fotos = [...(currentProfile?.fotos || [])];
    const oldAvatar = fotos[0];

    if (fotos.length === 0) {
        fotos.push(publicUrl);
    } else {
        fotos[0] = publicUrl;
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ fotos })
        .eq('id', currentUser.id);

    if (profileError) throw profileError;

    if (oldAvatar) await deleteStoredPhoto(oldAvatar);

    currentProfile = await getUserProfile(currentUser.id);
    loadUserAvatar();
            }

            // Calcular idade a partir da data de nascimento
            function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
            }

            // Setup edição inline no widget Meu Cantinho
            function setupInlineEditing() {
    const editableFields = document.querySelectorAll('.editable-field');

    editableFields.forEach(field => {
        field.addEventListener('click', function (e) {
            e.preventDefault();

            // Se já está editando, não faz nada
            if (this.classList.contains('editing')) return;

            const fieldName = this.dataset.field;
            if (!fieldName) return; // Se não tem data-field, não faz nada

            const originalValue = this.textContent;
            const isLink = this.tagName === 'A';
            const isDateField = fieldName === 'idade';
            const isPronomesField = fieldName === 'pronomes';
            const isSexualityField = fieldName === 'sexualidade';

            // Substituir elemento por input/select
            this.classList.add('editing');
            this.innerHTML = '';

            if (isPronomesField) {
                // Criar select para pronomes
                const select = document.createElement('select');
                select.className = 'inline-edit-input';

                const options = [
                    { value: 'ele/dele', text: 'Ele/Dele' },
                    { value: 'ela/dela', text: 'Ela/Dela' },
                    { value: 'elu/delu', text: 'Elu/Delu' },
                    { value: 'elx/delx', text: 'Elx/Delx' },
                    { value: 'não especificar', text: 'Não especificar' },
                    { value: 'outro', text: 'Outro' }
                ];

                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    if (currentProfile && currentProfile.pronomes === opt.value) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });

                this.appendChild(select);
                select.focus();

                // Input para "Outro"
                const otherInput = document.createElement('input');
                otherInput.type = 'text';
                otherInput.className = 'inline-edit-input';
                otherInput.style.marginTop = '4px';
                otherInput.style.display = 'none';
                otherInput.placeholder = 'Digite seu gênero...';
                this.appendChild(otherInput);

                // Mostrar input se selecionar "Outro"
                select.addEventListener('change', () => {
                    if (select.value === 'Outro') {
                        otherInput.style.display = 'block';
                        otherInput.focus();
                    } else {
                        otherInput.style.display = 'none';
                    }
                });

                // Função para salvar
                const saveEdit = async () => {
                    let newValue = select.value;
                    if (newValue === 'Outro') {
                        newValue = otherInput.value.trim() || 'Outro';
                    }

                    const displayValue = newValue || 'Gênero';

                    this.innerHTML = displayValue;
                    this.classList.remove('editing');

                    if (newValue === originalValue.trim()) return;

                    await saveFieldToDatabase(fieldName, newValue);
                };

                const cancelEdit = () => {
                    this.innerHTML = originalValue;
                    this.classList.remove('editing');
                };

                select.addEventListener('blur', () => {
                    setTimeout(() => {
                        if (document.activeElement !== otherInput) {
                            saveEdit();
                        }
                    }, 100);
                });

                otherInput.addEventListener('blur', saveEdit);

                select.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });

                otherInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });

            } else if (isSexualityField) {
                // Criar select para sexualidade
                const select = document.createElement('select');
                select.className = 'inline-edit-input';

                const options = [
                    { value: '', text: 'Selecione...' },
                    { value: 'Heterossexual', text: 'Heterossexual' },
                    { value: 'Homossexual', text: 'Homossexual' },
                    { value: 'Bissexual', text: 'Bissexual' },
                    { value: 'Pansexual', text: 'Pansexual' },
                    { value: 'Assexual', text: 'Assexual' },
                    { value: 'Demisexual', text: 'Demisexual' },
                    { value: 'Queer', text: 'Queer' },
                    { value: 'Questionando', text: 'Questionando' }
                ];

                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    if (currentProfile && currentProfile.sexualidade === opt.value) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });

                this.appendChild(select);
                select.focus();

                // Função para salvar
                const saveEdit = async () => {
                    const newValue = select.value;
                    const displayValue = newValue || 'Sexualidade';

                    this.innerHTML = displayValue;
                    this.classList.remove('editing');

                    if (newValue === originalValue.trim()) return;

                    await saveFieldToDatabase(fieldName, newValue);
                };

                const cancelEdit = () => {
                    this.innerHTML = originalValue;
                    this.classList.remove('editing');
                };

                select.addEventListener('blur', saveEdit);
                select.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });

            } else {
                // Criar input normal
                const input = document.createElement('input');

                if (isDateField) {
                    input.type = 'date';
                    if (currentProfile && currentProfile.data_nascimento) {
                        input.value = currentProfile.data_nascimento;
                    }
                } else {
                    input.type = isLink ? 'url' : 'text';
                    input.value = originalValue.replace(/^[🎂⚧🌈🧠🔗@]\s*/, '');
                }

                input.className = 'inline-edit-input';
                this.appendChild(input);
                input.focus();
                if (!isDateField) input.select();

                // Função para salvar
                const saveEdit = async () => {
                    const newValue = input.value.trim();
                    let displayValue;

                    if (isDateField) {
                        if (newValue) {
                            const idade = calculateAge(newValue);
                            displayValue = ` ${idade} anos`;
                        } else {
                            displayValue = 'Data de Nascimento';
                        }
                    } else {
                        displayValue = isLink ? `🔗 ${newValue}` : newValue;
                    }

                    this.innerHTML = displayValue;
                    this.classList.remove('editing');

                    const originalClean = originalValue.replace(/^[🎂⚧🌈🧠🔗@]\s*/, '').replace(' anos', '');
                    if (newValue === originalClean) return;

                    await saveFieldToDatabase(fieldName, newValue);
                };

                const cancelEdit = () => {
                    this.innerHTML = originalValue;
                    this.classList.remove('editing');
                };

                input.addEventListener('blur', saveEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        input.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });
            }
        });
    });
            }

            // Salvar campo no banco de dados
            async function saveFieldToDatabase(fieldName, value) {
    if (!supabase || !currentUser) return;

    try {
        const updateData = {};

        // Mapear nome do campo para coluna do banco
        const fieldMapping = {
            'nome': 'nome',
            'username': 'username',
            'local': 'local',
            'bio': 'bio',
            'pronomes': 'pronomes',
            'sexualidade': 'sexualidade',
            'mbti': 'mbti',
            'site': 'site_url',
            'idade': 'data_nascimento' // Campo idade salva como data_nascimento
        };

        const dbField = fieldMapping[fieldName];
        if (dbField) {
            updateData[dbField] = value;
        }

        if (Object.keys(updateData).length > 0) {
            console.log('Salvando no banco:', updateData);
            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', currentUser.id);

            if (error) throw error;

            // Atualizar currentProfile localmente
            currentProfile = { ...currentProfile, ...updateData };

            // Recarregar avatar se nome mudou
            if (fieldName === 'nome') {
                loadUserAvatar();
            }

            console.log('Salvo com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao salvar campo:', error.message);
        alert('Erro ao salvar: ' + error.message);
    }
            }

            async function uploadPostPhoto(file) {
    if (!supabase || !currentUser || !file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `post-${Date.now()}.${fileExt}`;
    const filePath = `${currentUser.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(SUPABASE_CONFIG.photosBucket)
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_CONFIG.photosBucket)
        .getPublicUrl(filePath);

    return publicUrl;
            }

            function compressImageToWebP(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width > height) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    } else {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        const webpFile = new File([blob], `${nameWithoutExt}.webp`, {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });
                        resolve(webpFile);
                    } else {
                        reject(new Error('Erro na conversão para WebP.'));
                    }
                }, 'image/webp', quality);
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem no canvas.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
        reader.readAsDataURL(file);
    });
            }

            // Notificações
            function formatNotificationText(notification) {
    const nome = notification.remetente?.apelido || notification.remetente?.nome || 'Alguém';

    if (notification.tipo === 'resposta') {
        return t('notif.reply', currentLanguage, {name: nome});
    }

    if (notification.tipo === 'mencao') {
        return t('notif.mention', currentLanguage, {name: nome});
    }

    return t('notif.reaction', currentLanguage, {name: nome, emoji: notification.emoji || ''});
            }

            function updateNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-badge');
    const bellIcon = document.getElementById('bell-icon');
    const bellRingIcon = document.getElementById('bell-ring-icon');
    const bellBtn = document.getElementById('btn-notifications');
    
    if (!badge) return;

    const previousCount = parseInt(badge.textContent) || 0;

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.classList.remove('hidden');
        // Trocar para bell-ring e adicionar animação
        if (bellIcon) bellIcon.classList.add('hidden');
        if (bellRingIcon) bellRingIcon.classList.remove('hidden');
        if (bellBtn) bellBtn.classList.add('ringing');
        // Tocar som se houver novas notificações
        if (unreadCount > previousCount) {
            playNotificationSound();
        }
    } else {
        badge.classList.add('hidden');
        // Voltar para bell e remover animação
        if (bellIcon) bellIcon.classList.remove('hidden');
        if (bellRingIcon) bellRingIcon.classList.add('hidden');
        if (bellBtn) bellBtn.classList.remove('ringing');
    }
            }

            function renderNotificationsList(notifications) {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;
    const list = headerContainer.querySelector('#notifications-list');
    if (!list) return;

    if (!notifications || notifications.length === 0) {
        list.innerHTML = `<p class="notifications-empty">${t('notif.empty', currentLanguage)}</p>`;
        return;
    }

    list.innerHTML = notifications.map(notification => `
        <button
            type="button"
            class="notification-item${notification.lida ? '' : ' unread'}"
            data-notification-id="${notification.id}"
            data-assunto-id="${notification.assunto}"
        >
            <span class="notification-text">${escapeHtml(formatNotificationText(notification))}</span>
            <span class="notification-time">${timeAgo(notification.criado_em)}</span>
        </button>
    `).join('');
            }

            async function loadNotifications() {
    if (!supabase || !currentUser) {
        updateNotificationBadge(0);
        renderNotificationsList([]);
        return;
    }

    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .select(`
    id,
    tipo,
    assunto,
    emoji,
    lida,
    criado_em,
    remetente:profiles!remetente(nome)
            `)
            .eq('destinatario', currentUser.id)
            .order('criado_em', { ascending: false })
            .limit(30);

        if (error) throw error;

        const unreadCount = (data || []).filter(n => !n.lida).length;
        updateNotificationBadge(unreadCount);
        renderNotificationsList(data || []);
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
    }
            }

            function unsubscribeFromNotifications() {
    if (notificationsChannel && supabase) {
        supabase.removeChannel(notificationsChannel);
        notificationsChannel = null;
    }
    stopNotificationsPolling();
            }

            function unsubscribeFromFeedUpdates() {
    if (feedUpdateChannel && supabase) {
        supabase.removeChannel(feedUpdateChannel);
        feedUpdateChannel = null;
    }
            }

            function subscribeToFeedUpdates() {
    if (!supabase) return;

    unsubscribeFromFeedUpdates();

    feedUpdateChannel = supabase
        .channel('feed-updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'assuntos'
        }, () => {
            loadFeed();
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_status'
        }, () => {
            loadFeed();
        })
        .subscribe();
            }

            function startNotificationsPolling() {
    stopNotificationsPolling();
    notificationsPollInterval = setInterval(() => {
        loadNotifications();
    }, 30000);
            }

            function stopNotificationsPolling() {
    if (notificationsPollInterval) {
        clearInterval(notificationsPollInterval);
        notificationsPollInterval = null;
    }
            }

            function subscribeToNotifications() {
    if (!supabase || !currentUser) return;

    unsubscribeFromNotifications();

    notificationsChannel = supabase
        .channel(`notifications-${currentUser.id}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notificacoes',
            filter: `destinatario=eq.${currentUser.id}`
        }, () => {
            loadNotifications();
        })
        .subscribe();

    startNotificationsPolling();
            }

            async function initNotifications() {
    await loadNotifications();
    subscribeToNotifications();
            }

            function closeNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
        dropdown.style.display = 'none';
    }
            }

            function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    const avatarDropdown = document.getElementById('avatar-dropdown');
    if (!dropdown) return;

    const willOpen = !dropdown.classList.contains('show');
    dropdown.classList.toggle('show');

    if (avatarDropdown) avatarDropdown.classList.remove('show');

    if (willOpen) {
        loadNotifications();
    }
            }

            async function markNotificationRead(notificationId) {
    if (!supabase || !currentUser) return;

    await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificationId)
        .eq('destinatario', currentUser.id);
            }

            async function markAllNotificationsRead() {
    if (!supabase || !currentUser) return;

    try {
        const { error } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('destinatario', currentUser.id)
            .eq('lida', false);

        if (error) throw error;
        await loadNotifications();
    } catch (error) {
        console.error('Erro ao marcar notificações como lidas:', error);
    }
            }

            async function openNotificationTarget(assuntoId) {
    showScreen('main');
    showFeedView();
    expandedReplies.add(assuntoId);
    // Navegar para a URL do post
    window.location.hash = `/post/${assuntoId}`;
            }

            async function handleNotificationListClick(e) {
    const item = e.target.closest('.notification-item');
    if (!item) return;

    const notificationId = item.dataset.notificationId;
    const assuntoId = item.dataset.assuntoId;

    await markNotificationRead(notificationId);
    await openNotificationTarget(assuntoId);
    await loadNotifications();
    closeNotificationsDropdown();
            }

            // Handle logout
            async function handleLogout() {
    if (!supabase) {
        alert(t('error.supabaseNotConfigured', currentLanguage));
        return;
    }

    if (confirm(t('confirm.logout', currentLanguage))) {
        await supabase.auth.signOut();
        window.location.reload();
    }
            }

            // Status Modal
            let currentStatusType = 'listening';
            let currentStatusEmoji = '🎧';

            const statusTypeDefaults = {
    listening: { label: 'ouvindo', defaultEmoji: '🎧' },
    eating: { label: 'comendo', defaultEmoji: '🍽️' },
    reading: { label: 'lendo', defaultEmoji: '📚' },
    watching: { label: 'assistindo', defaultEmoji: '📺' },
    doing: { label: 'fazendo', defaultEmoji: '🔨' },
    thinking: { label: 'pensando em', defaultEmoji: '💭' }
            };

            window.openStatusModal = openStatusModal;
            async function openStatusModal(type = 'listening') {
    const modal = document.getElementById('status-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    currentStatusType = type;
    const defaultConfig = statusTypeDefaults[type] || statusTypeDefaults['listening'];
    currentStatusEmoji = defaultConfig.defaultEmoji;

    // Tentar buscar status existente deste tipo do usuário
    let existingStatus = null;
    if (currentUser && getUserStatus) {
        try {
            existingStatus = await getUserStatus(currentUser.id, type);
        } catch (err) {
            console.warn('Status existente não encontrado:', err);
        }
    }

    // Selecionar botão visualmente
    selectStatusType(type, existingStatus ? existingStatus.emoji : defaultConfig.defaultEmoji);

    const contentInput = document.getElementById('status-content');
    const fixedCheckbox = document.getElementById('status-fixed');
    const emojiDisplay = document.getElementById('status-emoji-display');

    if (existingStatus) {
        if (contentInput) contentInput.value = existingStatus.content || '';
        if (fixedCheckbox) fixedCheckbox.checked = Boolean(existingStatus.is_fixed);
        if (emojiDisplay) emojiDisplay.textContent = existingStatus.emoji || defaultConfig.defaultEmoji;
        currentStatusEmoji = existingStatus.emoji || defaultConfig.defaultEmoji;
    } else {
        if (contentInput) contentInput.value = '';
        if (fixedCheckbox) fixedCheckbox.checked = false;
        if (emojiDisplay) emojiDisplay.textContent = defaultConfig.defaultEmoji;
    }
            }

            function closeStatusModal() {
    const modal = document.getElementById('status-modal');
    if (modal) modal.classList.add('hidden');
            }

            function selectStatusType(type, emoji = null) {
    currentStatusType = type;
    const defaultConfig = statusTypeDefaults[type] || statusTypeDefaults['listening'];
    currentStatusEmoji = emoji || defaultConfig.defaultEmoji;

    // Atualizar botões de tipo
    document.querySelectorAll('.status-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });

    // Atualizar rótulo de ação e emoji
    const label = document.getElementById('status-action-label');
    if (label) label.textContent = defaultConfig.label;

    const emojiDisplay = document.getElementById('status-emoji-display');
    if (emojiDisplay) emojiDisplay.textContent = currentStatusEmoji;
            }

            function handleStatusEmojiChange() {
    const defaultEmoji = statusTypeDefaults[currentStatusType]?.defaultEmoji || '🎧';
    const choice = prompt('Digite ou cole um novo emoji para este status:', currentStatusEmoji || defaultEmoji);
    if (choice !== null && choice.trim() !== '') {
        currentStatusEmoji = choice.trim();
        const display = document.getElementById('status-emoji-display');
        if (display) display.textContent = currentStatusEmoji;
    }
            }

            async function saveStatus() {
    if (!currentUser) {
        alert('Faça login para atualizar seu status.');
        return;
    }

    const contentInput = document.getElementById('status-content');
    const content = contentInput ? contentInput.value.trim() : '';
    const isFixed = document.getElementById('status-fixed')?.checked || false;

    if (!content) {
        // Se o conteúdo estiver vazio, deleta o status
        return deleteStatus();
    }

    try {
        const statusData = {
            type: currentStatusType,
            emoji: currentStatusEmoji,
            content: content,
            is_fixed: isFixed
        };

        const result = upsertUserStatus ? await upsertUserStatus(currentUser.id, statusData) : null;

        closeStatusModal();
        await loadUserStatuses(currentUser.id);
        if (currentProfile && cantinhoView && !cantinhoView.classList.contains('hidden')) {
            await loadCantinhoData(currentProfile);
        }
        await loadFeed();
    } catch (error) {
        console.error('Erro ao salvar status:', error);
        alert('Erro ao salvar status. Tente novamente.');
    }
            }

            async function deleteStatus() {
    if (!currentUser) return;

    try {
        if (deleteUserStatus) {
            await deleteUserStatus(currentUser.id, currentStatusType);
        }
        closeStatusModal();
        await loadUserStatuses(currentUser.id);
        if (currentProfile && cantinhoView && !cantinhoView.classList.contains('hidden')) {
            await loadCantinhoData(currentProfile);
        }
        await loadFeed();
    } catch (error) {
        console.error('Erro ao remover status:', error);
    }
            }

            // Carregar múltiplos status do perfil (sidebar do feed + tela do Cantinho)
            async function loadUserStatuses(userId) {
    if (!userId) return;

    let statuses = [];
    try {
        if (getUserStatuses) {
            statuses = await getUserStatuses(userId);
        }
    } catch (error) {
        console.warn('Não foi possível carregar os status do usuário:', error);
    }

    statuses.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
    });

    renderStatusList('right-profile-status-list', statuses, userId);
    renderStatusList('cantinho-status-list', statuses, userId);
            }

            function renderStatusList(containerId, statuses, userId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isOwner = Boolean(currentUser && currentUser.id === userId);
    const usedTypes = (statuses || []).map(status => status.type);
    const statusCard = container.closest('.sidebar-card');

    if (!statuses || statuses.length === 0) {
        if (isOwner) {
            container.innerHTML = '<div class="status-item clickable status-empty" role="button" tabindex="0">O que está fazendo? Clique para adicionar.</div>';
            const placeholder = container.querySelector('.status-empty');
            if (placeholder) {
                placeholder.addEventListener('click', () => {
                    openStatusModal();
                });
                placeholder.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStatusModal();
                    }
                });
            }
            // Mostrar card se for dono
            if (statusCard) {
                statusCard.style.display = 'block';
            }
        } else {
            container.innerHTML = '';
            // Esconder card se não for dono e não tiver status
            if (statusCard) {
                statusCard.style.display = 'none';
            }
        }
        return;
    }

    const statusItemsHtml = statuses.map(status => {
        const actionLabel = statusTypeLabels[status.type] || status.type;
        const displayText = status.content ? escapeHtml(status.content) : escapeHtml(actionLabel);
        const fixedTag = isOwner && status.is_fixed ? '<span class="status-fixed-indicator" title="Fixo no Cantinho">📌</span>' : '';
        const clickableClass = isOwner ? 'clickable' : 'status-clickable';

        return `
            <div class="status-item ${clickableClass}" data-type="${status.type}" data-user-id="${userId}" data-status-id="${status.id}" data-status-url="/status/${status.id}">
    <span class="status-icon">${status.emoji || '💬'}</span>
    <span class="status-text">
        <span class="status-text-track">
            <span class="status-text-content">${displayText}</span>
            <span class="status-text-content" aria-hidden="true">${displayText}</span>
        </span>
    </span>
    ${fixedTag}
            </div>
        `;
    }).join('');

    const html = statusItemsHtml;
    container.innerHTML = html;

    // Mostrar card se tiver status (independente de ser dono)
    if (statusCard) {
        statusCard.style.display = 'block';
    }

    container.querySelectorAll('.status-item').forEach(item => {
        const text = item.querySelector('.status-text');
        const content = item.querySelector('.status-text-content');
        if (text && content && content.scrollWidth > text.clientWidth) {
            text.classList.add('marquee');
        } else if (text) {
            text.classList.remove('marquee');
        }
    });

    if (isOwner) {
        container.querySelectorAll('.status-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                openStatusModal(item.dataset.type);
            });
        });
    } else {
        // Para outros usuários, clicar no status navega para o Cantinho com o status no topo
        container.querySelectorAll('.status-item.status-clickable').forEach(item => {
            item.addEventListener('click', async () => {
                const statusId = item.dataset.statusId;
                if (statusId) {
                    // Buscar o status para saber o dono
                    try {
                        const { data: status } = await supabase
                            .from('user_status')
                            .select('user_id')
                            .eq('id', statusId)
                            .single();
                        
                        if (status && status.user_id) {
                            // Buscar o username do usuário
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', status.user_id)
                                .single();
                            
                            if (profile && profile.username) {
                                // Navegar para o Cantinho do usuário com o status específico
                                window.location.hash = `/@${profile.username}/status/${statusId}`;
                            }
                        }
                    } catch (error) {
                        console.error('Erro ao buscar status:', error);
                    }
                }
            });
        });
    }
            }

            function bindCantinhoWidgetEditHandlers(profileId) {
    const isOwner = Boolean(currentUser && currentUser.id === profileId);

    // Se não for o dono, não fazer nada - não modificar os elementos
    if (!isOwner) return;

    const avatarWrapper = document.getElementById('cantinho-avatar-wrapper');
    const nameEl = document.getElementById('cantinho-name');
    const locationEl = document.getElementById('cantinho-pais');
    const bioEl = document.getElementById('cantinho-bio');

    // Desabilitar edição inline no Meu Cantinho - edição só em Configurações
    // Comentado para desabilitar edição inline
    /*
    const setupField = (element, fieldKey, multiline = false) => {
        if (!element) return;
        const cloned = element.cloneNode(true);
        element.parentNode.replaceChild(cloned, element);

        cloned.classList.add('profile-field-editable');
        cloned.setAttribute('role', 'button');
        cloned.setAttribute('tabindex', '0');
        cloned.setAttribute('title', 'Clique para editar');

        const finishEdit = async (input, originalText) => {
            const newValue = input.value.trim();
            if (newValue !== originalText) {
                await saveCantinhoField(fieldKey, newValue);
            } else {
                restoreText();
            }
        };

        const restoreText = (originalText) => {
            cloned.textContent = originalText;
        };

        const bindFieldListeners = () => {
            cloned.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const original = cloned.textContent.trim();
                const input = multiline ? document.createElement('textarea') : document.createElement('input');
                input.value = original;
                input.className = 'profile-field-input';
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                if (multiline) {
                    input.rows = 4;
                }

                cloned.innerHTML = '';
                cloned.appendChild(input);
                input.focus();
                input.select();

                input.addEventListener('keydown', async (event) => {
                    if (!multiline && event.key === 'Enter') {
                        event.preventDefault();
                        input.blur();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        restoreText();
                    }
                });

                input.addEventListener('blur', async () => {
                    await finishEdit(input, original);
                });
            });

            cloned.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cloned.click();
                }
            });
        };

        bindFieldListeners();
    };

    const setupAvatar = (wrapper) => {
        if (!wrapper) return;
        const cloned = wrapper.cloneNode(true);
        wrapper.parentNode.replaceChild(cloned, wrapper);

        if (!isOwner) {
            cloned.classList.remove('profile-field-editable');
            cloned.removeAttribute('role');
            cloned.removeAttribute('tabindex');
            cloned.removeAttribute('title');
            return;
        }

        // Desabilitar edição inline da foto no Meu Cantinho
        // cloned.classList.add('profile-field-editable');
        // cloned.setAttribute('role', 'button');
        // cloned.setAttribute('tabindex', '0');
        // cloned.setAttribute('title', 'Clique para alterar a foto');
        // cloned.addEventListener('click', (e) => {
        //     e.preventDefault();
        //     e.stopPropagation();
        //     openAvatarUpload();
        // });
        // cloned.addEventListener('keydown', (e) => {
        //     if (e.key === 'Enter' || e.key === ' ') {
        //         e.preventDefault();
        //         openAvatarUpload();
        //     }
        // });
    };

    // Desabilitar edição inline no Meu Cantinho - edição só em Configurações
    // setupField(nameEl, 'nome');
    // setupField(bioEl, 'bio', true);
    // setupAvatar(avatarWrapper);
    */
}

async function goToCantinho() {
    console.log('Ir para Cantinho');
    showCantinhoView();
    await loadCantinhoData(currentProfile);
}

function openUsersModal() {
    const usersModal = document.getElementById('users-modal');
    if (usersModal) {
        usersModal.classList.remove('hidden');
        loadUsersModalData();
    }
}

// Fechar modal de usuários
function closeUsersModal() {
    const usersModal = document.getElementById('users-modal');
    if (usersModal) {
        usersModal.classList.add('hidden');
    }
}

// Abrir modal de configurações (mobile)
function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.remove('hidden');
    }
}

// Fechar modal de configurações (mobile)
function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('hidden');
    }
}

// Abrir modal de tags
function openTagsModal() {
    const tagsModal = document.getElementById('tags-modal');
    if (tagsModal) {
        tagsModal.classList.remove('hidden');
        loadTagsModalData();
    }
}

// Fechar modal de tags
function closeTagsModal() {
    const tagsModal = document.getElementById('tags-modal');
    if (tagsModal) {
        tagsModal.classList.add('hidden');
    }
}

// Carregar dados de tags no modal
function loadTagsModalData() {
    const allTags = tagsCache || [];
    const container = document.getElementById('modal-tags-grid');
    if (!container) return;

    if (allTags.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma tag encontrada.</p>';
        return;
    }

    container.innerHTML = allTags.map(tag => {
        const emoji = tag.emoji || '🏷️';
        const nome = tag.nome || 'Sem nome';
        return `
            <button type="button" class="tag-card" data-tag="${escapeHtml(tag.nome)}">
    <span class="tag-card-emoji">${escapeHtml(emoji)}</span>
    <span class="tag-card-name">${escapeHtml(nome)}</span>
            </button>
        `;
    }).join('');

    // Adicionar event listeners para filtrar ao clicar
    container.querySelectorAll('.tag-card').forEach(card => {
        card.addEventListener('click', () => {
            const tag = card.dataset.tag;
            closeTagsModal();
            currentTagFilter = tag;
            // Garantir que estamos filtrando posts (assuntos)
            currentContentFilter = 'posts';
            currentStatusFilter = 'all';
            updateFilterOptions('[data-tag-filter]', currentTagFilter);
            updateFilterOptions('[data-content-filter]', currentContentFilter);
            updateFilterOptions('[data-status-filter]', currentStatusFilter);
            document.querySelectorAll('.tag-btn').forEach(tagButton => {
                tagButton.classList.toggle('active', tagButton.dataset.tag === currentTagFilter);
            });
            document.querySelectorAll('[data-content-filter]').forEach(item => {
                item.classList.toggle('active', item.dataset.contentFilter === currentContentFilter);
            });
            loadFeed();
        });
    });
}

// Carregar dados de usuários no modal
async function loadUsersModalData() {
    if (!supabase) return;

    try {
        // Atualizar presença do usuário atual primeiro
        await updateCurrentUserPresence();

        // Usar a mesma query que loadOnlineVisitors (últimos 5 minutos)
        const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
        const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

        const { data: onlineProfiles, error: onlineError } = await supabase
            .from('profiles')
            .select('id, nome, fotos, username, ultimo_acesso')
            .gt('ultimo_acesso', cutoff)
            .order('ultimo_acesso', { ascending: false });

        if (onlineError) throw onlineError;

        renderUsersGrid('modal-online-users-grid', onlineProfiles || []);

        // Buscar todos os perfis
        const { data: allProfiles, error: allError } = await supabase
            .from('profiles')
            .select('*')
            .order('criado_em', { ascending: false });

        if (allError) throw allError;

        renderUsersGrid('modal-all-users-grid', allProfiles || []);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Renderizar grid de usuários
function renderUsersGrid(containerId, profiles) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!profiles || profiles.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum usuário encontrado.</p>';
        return;
    }

    container.innerHTML = profiles.map(profile => {
        const avatar = profile.fotos?.[0] || '';
        const username = profile.username || 'sem-username';
        const name = profile.nome || 'Visitante';

        // Remover @ do username se já tiver
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

        return `
            <button type="button" class="user-card" data-username="${escapeHtml(cleanUsername)}">
    ${avatar ?
                `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="user-avatar">` :
                `<div class="user-avatar-placeholder">${escapeHtml(name.charAt(0).toUpperCase())}</div>`
            }
    <div class="user-tooltip">
        <span class="user-name">${escapeHtml(name)}</span>
        <span class="user-username">@${escapeHtml(cleanUsername)}</span>
    </div>
            </button>
        `;
    }).join('');

    // Adicionar event listeners para navegação ao Cantinho
    container.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => {
            const username = card.dataset.username;
            closeUsersModal();
            goToProfile(username);
        });
    });
}

// --- Funções do Cantinho ---
function showCantinhoView() {
    if (!feedView || !settingsView || !cantinhoView || !mainContent) return;
    feedView.classList.add('hidden');
    settingsView.classList.add('hidden');
    cantinhoView.classList.remove('hidden');
    const publicProfileView = document.getElementById('public-profile-view');
    if (publicProfileView) publicProfileView.classList.add('hidden');
    const adminView = document.getElementById('admin-view');
    if (adminView) adminView.classList.add('hidden');
    const pageView = document.getElementById('page-view');
    if (pageView) pageView.classList.add('hidden');
    if (mainScreen) mainScreen.classList.remove('settings-mode');
    mainContent.classList.remove('settings-mode');
    mainContent.style.padding = '';
    updateScrollTopVisibility();

    // Atualizar navegação do header
    updateHeaderNavigation();

    // Carregar visitantes online e assuntos de hoje para o Cantinho
    loadOnlineVisitorsForCantinho();
    loadTrendingTopicsForCantinho();
}

function goToMyCantinho() {
    // Marcar que estamos no próprio cantinho
    isViewingOtherUsersCantinho = false;

    // Atualizar URL para o próprio cantinho
    window.location.hash = '#/cantinho';

    // Esconder botão de apelido
    const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
    if (navItemCantinhoDono) {
        navItemCantinhoDono.classList.add('hidden');
    }

    showCantinhoView();
    loadCantinhoData(currentProfile)
        .catch(err => console.error('Erro ao carregar cantinho:', err))
        .finally(() => {
            // Atualizar navegação do header após carregar os dados
            updateHeaderNavigation();
        });

    // Reset scroll position para o perfil no mobile
    const cantinhoView = document.querySelector('.cantinho-view');
    if (cantinhoView && window.innerWidth <= 1023) {
        cantinhoView.scrollLeft = 0;
        setupCantinhoSwipe(cantinhoView);
    }
}

function setupCantinhoSwipe(cantinhoView) {
    const cantinhoContent = document.querySelector('.cantinho-content');

    const handleScroll = () => {
        if (cantinhoView.scrollLeft > 50) {
            cantinhoContent.classList.add('show-indicator');
        } else {
            cantinhoContent.classList.remove('show-indicator');
        }
    };

    cantinhoView.addEventListener('scroll', handleScroll);
}

// Handlers para edição no Cantinho
function handleCantinhoNameBlur(e) {
    const newName = e.target.textContent.trim();
    if (newName && newName !== currentProfile?.nome) {
        saveCantinhoField('nome', newName);
    }
}

function handleCantinhoNameKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
}

function handleCantinhoBioBlur(e) {
    const newBio = e.target.textContent.trim();
    if (newBio !== currentProfile?.bio) {
        saveCantinhoField('bio', newBio);
    }
}

function handleCantinhoBioKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.target.blur();
    }
}

async function goToProfile(username = null) {
    const cantinhoTitle = document.getElementById('cantinho-title');
    const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
    const cantinhoDonoLabel = document.getElementById('cantinho-dono-label');

    // Se temos username, tentamos carregar o perfil desse usuário
    if (username) {
        // Remover @ duplicado se existir
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

        // Normalizar o username do perfil atual também
        const currentUsername = currentProfile?.username?.startsWith('@') 
            ? currentProfile.username.substring(1) 
            : currentProfile?.username;

        // Se for o próprio perfil, vai para o cantinho
        if (cleanUsername === currentUsername) {
            isViewingOtherUsersCantinho = false;
            if (cantinhoTitle) {
                cantinhoTitle.textContent = t('nav.myCantinho', currentLanguage);
            }
            if (navItemCantinhoDono) {
                navItemCantinhoDono.classList.add('hidden');
            }
            showCantinhoView();
            await loadCantinhoData(currentProfile);
            await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
            updateHeaderNavigation();
            return;
        }

        try {
            const { getUserProfileByUsername } = await import('./supabase-client.js');
            const otherProfile = await getUserProfileByUsername(cleanUsername);

            if (otherProfile) {
                // Atualizar URL para o perfil do usuário
                window.location.hash = `/@${cleanUsername}`;
                // Marcar que estamos no cantinho de outra pessoa
                isViewingOtherUsersCantinho = true;
                // Mostrar botão com apelido do dono do cantinho (usar apelido ou username como fallback)
                if (navItemCantinhoDono && cantinhoDonoLabel) {
                    const displayName = otherProfile.apelido || otherProfile.username || cleanUsername;
                    navItemCantinhoDono.classList.remove('hidden');
                    cantinhoDonoLabel.textContent = displayName;
                    // Atualizar o href para apontar para o perfil público correto
                    navItemCantinhoDono.href = `#/profile/${cleanUsername}`;
                    // Remover o comportamento padrão e adicionar event listener
                    navItemCantinhoDono.onclick = (e) => {
                        e.preventDefault();
                        window.location.hash = `/profile/${cleanUsername}`;
                    };
                }
                showCantinhoView();
                await loadCantinhoData(otherProfile);
                await loadProfileMusic(otherProfile, 'cantinho-music-player-card');
                // Atualizar navegação do header após carregar os dados
                updateHeaderNavigation();
            } else {
                // Se não encontrar, mostra o próprio perfil
                isViewingOtherUsersCantinho = false;
                if (cantinhoTitle) {
                    cantinhoTitle.textContent = 'Meu Cantinho';
                }
                // Esconder botão de apelido
                if (navItemCantinhoDono) {
                    navItemCantinhoDono.classList.add('hidden');
                }
                window.location.hash = '#/cantinho';
                showCantinhoView();
                await loadCantinhoData(currentProfile);
                await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
                updateHeaderNavigation();
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            // Se der erro, mostra o próprio perfil
            isViewingOtherUsersCantinho = false;
            if (cantinhoTitle) {
                cantinhoTitle.textContent = t('nav.myCantinho', currentLanguage);
            }
            // Esconder botão de apelido
            if (navItemCantinhoDono) {
                navItemCantinhoDono.classList.add('hidden');
            }
            window.location.hash = '#/cantinho';
            showCantinhoView();
            await loadCantinhoData(currentProfile);
            await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
            updateHeaderNavigation();
        }
    } else {
        // Se não tem username, mostra o próprio cantinho
        isViewingOtherUsersCantinho = false;
        if (cantinhoTitle) {
            cantinhoTitle.textContent = 'Meu Cantinho';
        }
        if (navItemCantinhoDono) {
            navItemCantinhoDono.classList.add('hidden');
        }
        showCantinhoView();
        await loadCantinhoData(currentProfile);
        await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
        updateHeaderNavigation();
    }
}

async function goToProfileWithStatus(username, statusId) {
    const cantinhoTitle = document.getElementById('cantinho-title');
    const navItemCantinhoDono = document.getElementById('nav-item-cantinho-dono');
    const cantinhoDonoLabel = document.getElementById('cantinho-dono-label');

    // Remover @ duplicado se existir
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    try {
        const { getUserProfileByUsername } = await import('./supabase-client.js');
        const otherProfile = await getUserProfileByUsername(cleanUsername);

        if (otherProfile) {
            // Atualizar URL para o perfil do usuário com status
            window.location.hash = `/@${cleanUsername}/status/${statusId}`;
            // Atualizar título do cantinho para mostrar que é de outro usuário
            if (cantinhoTitle) {
                cantinhoTitle.textContent = `Cantinho de @${cleanUsername}`;
            }
            // Mostrar botão com apelido do dono do cantinho
            if (navItemCantinhoDono && cantinhoDonoLabel && otherProfile.apelido) {
                console.log('Mostrando botão de apelido:', otherProfile.apelido, otherProfile);
                navItemCantinhoDono.classList.remove('hidden');
                cantinhoDonoLabel.textContent = otherProfile.apelido;
            }
            showCantinhoView();
            await loadCantinhoData(otherProfile);
            await loadProfileMusic(otherProfile, 'cantinho-music-player-card');
            
            // Buscar o status específico e mostrar no topo do feed do Cantinho
            const cantinhoFeedContent = document.getElementById('cantinho-feed-content');
            if (cantinhoFeedContent) {
                const { data: specificStatus } = await supabase
                    .from('user_status')
                    .select('*')
                    .eq('id', statusId)
                    .single();
                
                if (specificStatus) {
                    // Verificar se o status já está no feed
                    const existingStatusCard = cantinhoFeedContent.querySelector(`.status-card[data-status-id="${statusId}"]`);
                    if (existingStatusCard) {
                        // Se já existe, apenas destacar
                        existingStatusCard.style.transition = 'box-shadow 0.3s ease';
                        existingStatusCard.style.boxShadow = '0 0 0 3px var(--accent-primary)';
                        setTimeout(() => {
                            existingStatusCard.style.boxShadow = '';
                        }, 3000);
                    } else {
                        // Buscar o perfil do usuário do status
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('id, apelido, nome, fotos, username')
                            .eq('id', specificStatus.user_id)
                            .single();
                        
                        specificStatus.profiles = profileData;
                        
                        // Criar o card do status
                        const statusCard = await createStatusCard(specificStatus);
                        
                        // Adicionar no topo do feed do Cantinho
                        cantinhoFeedContent.insertAdjacentHTML('afterbegin', statusCard);
                        
                        // Destacar o status
                        const statusCardElement = cantinhoFeedContent.querySelector('.status-card');
                        if (statusCardElement) {
                            statusCardElement.style.transition = 'box-shadow 0.3s ease';
                            statusCardElement.style.boxShadow = '0 0 0 3px var(--accent-primary)';
                            setTimeout(() => {
                                statusCardElement.style.boxShadow = '';
                            }, 3000);
                        }
                    }
                }
            }
        } else {
            // Se não encontrar, mostra o próprio perfil
            if (cantinhoTitle) {
                cantinhoTitle.textContent = t('nav.myCantinho', currentLanguage);
            }
            window.location.hash = '#/cantinho';
            showCantinhoView();
            await loadCantinhoData(currentProfile);
            await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        // Se der erro, mostra o próprio perfil
        if (cantinhoTitle) {
            cantinhoTitle.textContent = 'Meu Cantinho';
        }
        window.location.hash = '#/cantinho';
        showCantinhoView();
        await loadCantinhoData(currentProfile);
        await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
    }
}

async function loadCantinhoData(profile) {
    if (!profile) {
        console.error('loadCantichoData: profile is null');
        return;
    }

    // Aplicar background do dono do cantinho
    applyBackground(profile);

    // Aplicar fontes personalizadas
    const isOwner = Boolean(currentUser && currentUser.id === profile.id);
    if (isOwner) {
        applyUserFonts(profile);
    } else {
        applyPublicUserFonts(profile);
    }

    // Usar o novo componente para atualizar o card de perfil do cantinho
    updateCantinhoProfileCard(profile, isOwner);

    // Adicionar role badge ao apelido
    const cantinhoApelido = document.getElementById('cantinho-apelido');
    if (cantinhoApelido) {
        const roleBadge = await getRoleBadge(profile.id);
        cantinhoApelido.innerHTML = `${escapeHtml(profile.apelido || profile.nome || 'Visitante')}${roleBadge}`;
    }

    // Elementos adicionais do Cantinho
    const cantinhoPhotosGrid = document.getElementById('cantinho-photos-grid');
    const cantinhoPhotosCount = document.getElementById('cantinho-photos-count');
    const cantinhoFeedContent = document.getElementById('cantinho-feed-content');

    // Elementos para edição e campos configuráveis
    const cantinhoName = document.getElementById('cantinho-name');
    const cantinhoBio = document.getElementById('cantinho-bio');
    const cantinhoAge = document.getElementById('cantinho-age');
    const cantinhoGender = document.getElementById('cantinho-gender');
    const cantinhoSexuality = document.getElementById('cantinho-sexuality');
    const cantinhoMbti = document.getElementById('cantinho-mbti');
    const cantinhoSite = document.getElementById('cantinho-site');
    const cantinhoPais = document.getElementById('cantinho-pais');

    // Carregar player de música se tiver SoundCloud
    if (profile.soundcloud_url) {
        await loadProfileMusic(profile);
    }

    // Idade
    if (cantinhoAge) {
        if (profile.show_idade === true && profile.data_nascimento) {
            const idade = calculateAge(profile.data_nascimento);
            cantinhoAge.textContent = `${idade} anos`;
            cantinhoAge.classList.remove('hidden');
        } else {
            cantinhoAge.classList.add('hidden');
        }
    }

    // Pronomes
    if (cantinhoGender) {
        if (profile.show_pronomes === true && profile.pronomes) {
            cantinhoGender.textContent = profile.pronomes;
            cantinhoGender.classList.remove('hidden');
        } else {
            cantinhoGender.classList.add('hidden');
        }
    }

    // Sexualidade
    if (cantinhoSexuality) {
        if (profile.show_sexualidade === true && profile.sexualidade) {
            cantinhoSexuality.textContent = profile.sexualidade;
            cantinhoSexuality.classList.remove('hidden');
        } else {
            cantinhoSexuality.classList.add('hidden');
        }
    }

    // MBTI
    if (cantinhoMbti) {
        if (profile.show_mbti !== false && profile.mbti) {
            cantinhoMbti.textContent = profile.mbti;
            cantinhoMbti.classList.remove('hidden');
        } else {
            cantinhoMbti.classList.add('hidden');
        }
    }

    // Site
    if (cantinhoSite) {
        if (profile.show_site === true && profile.site_url) {
            cantinhoSite.href = profile.site_url;
            cantinhoSite.target = '_blank';
            cantinhoSite.rel = 'noopener';
            cantinhoSite.title = profile.site_url;
            cantinhoSite.classList.remove('hidden');
        } else {
            cantinhoSite.classList.add('hidden');
        }
    }

    // Local (usando a coluna 'local')
    if (cantinhoPais) {
        if (profile.show_local === true && profile.local) {
            cantinhoPais.textContent = profile.local;
            cantinhoPais.classList.remove('hidden');
        } else {
            cantinhoPais.classList.add('hidden');
        }
    }

    // Carregar status do usuário
    if (profile.id) {
        await loadUserStatuses(profile.id);
    }

    // Carregar fotos
    if (cantinhoPhotosGrid) {
        await loadUserPhotos(profile.id);
    }

    currentCantinhoProfileId = profile.id;
    bindCantinhoWidgetEditHandlers(profile.id);
    bindBetaInvitePanel(profile.id);

    // Carregar assuntos do usuário
    if (cantinhoFeedContent && profile.id) {
        try {
            const { getUserAssuntos } = await import('./supabase-client.js');
            const assuntos = await getUserAssuntos(profile.id);

            if (assuntos.length === 0) {
                cantinhoFeedContent.innerHTML = '<p class="feed-loading">' + t('feed.noPostsYet', currentLanguage) + '</p>';
            } else {
                // Renderizar assuntos (reutilizar a lógica de renderização do feed)
                const cards = await Promise.all(assuntos.map(assunto => createAssuntoCard(assunto, profile)));
                cantinhoFeedContent.innerHTML = cards.join('');
            }
        } catch (error) {
            console.error('Erro ao carregar assuntos do usuário:', error);
            cantinhoFeedContent.innerHTML = '<p class="feed-loading">' + t('feed.errorLoadAssuntos', currentLanguage) + '</p>';
        }
    }

    // Carregar assuntos fixados
    await loadPinnedAssuntos(profile.id);

    // TODO: Carregar marquinhas
}

// Função para tocar som de notificação
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.error('Erro ao tocar som de notificação:', error);
    }
}

// Função para aplicar fontes personalizadas ao cantinho do usuário
function applyUserFonts(profile, containerSelector = null) {
    if (!profile) return;

    const fontTitle = profile.font_title;
    const fontBody = profile.font_body;
    const apelidoFontSize = profile.apelido_font_size || 48;
    const bodyFontSize = profile.body_font_size || 13;

    console.log('Aplicando fontes:', { fontTitle, fontBody, apelidoFontSize, bodyFontSize, containerSelector });

    // Se containerSelector for fornecido, aplicar apenas ao container específico (mostruário)
    if (containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // Aplicar fonte de título ao apelido no container
        if (fontTitle) {
            container.querySelectorAll('.profile-apelido-title').forEach(el => {
                el.style.setProperty('font-family', `'${fontTitle}', sans-serif`, 'important');
            });
        }

        // Aplicar tamanho do apelido no container
        container.querySelectorAll('.profile-apelido-title').forEach(el => {
            el.style.fontSize = `${apelidoFontSize}px`;
        });

        // Fonte de corpo no container
        if (fontBody) {
            container.querySelectorAll('p, span, div, label, small').forEach(el => {
                el.style.fontFamily = `'${fontBody}', sans-serif`;
            });
        }

        // Aplicar tamanho da fonte geral no container
        container.querySelectorAll('p, span, div, label, small').forEach(el => {
            el.style.fontSize = `${bodyFontSize}px`;
        });

        return;
    }

    // Aplicação global (sem container específico)
    // Aplicar fontes globalmente usando CSS variables
    if (fontTitle) {
        document.documentElement.style.setProperty('--user-font-title', `'${fontTitle}', sans-serif`);
    } else {
        document.documentElement.style.removeProperty('--user-font-title');
    }

    if (fontBody) {
        document.documentElement.style.setProperty('--user-font-body', `'${fontBody}', sans-serif`);
    } else {
        document.documentElement.style.removeProperty('--user-font-body');
    }

    // Aplicar tamanho do apelido
    document.documentElement.style.setProperty('--user-apelido-font-size', `${apelidoFontSize}px`);

    // Aplicar tamanho da fonte geral globalmente
    document.documentElement.style.setProperty('--user-body-font-size', `${bodyFontSize}px`);

    // Aplicar fonte de título ao apelido (mas não ao header)
    if (fontTitle) {
        document.querySelectorAll('.profile-apelido, .cantinho-apelido, #cantinho-apelido, .sidebar-right .profile-apelido-title, .author-name, .reply-author').forEach(el => {
            el.style.setProperty('font-family', `'${fontTitle}', sans-serif`, 'important');
        });
    }

    // Aplicar tamanho do apelido em todos os lugares
    document.querySelectorAll('.profile-apelido, .cantinho-apelido, #cantinho-apelido, .sidebar-right .profile-apelido-title').forEach(el => {
        el.style.fontSize = `${apelidoFontSize}px`;
    });

    // A fonte de corpo (fontBody) e tamanho são aplicados globalmente via CSS variables no body
    // Não precisa aplicar em elementos específicos
}

// Função para aplicar fontes ao cantinho público de outro usuário
function applyPublicUserFonts(profile) {
    if (!profile) return;

    const fontTitle = profile.font_title;
    const fontBody = profile.font_body;
    const apelidoFontSize = profile.apelido_font_size || 48;
    const bodyFontSize = profile.body_font_size || 13;

    console.log('Aplicando fontes públicas:', { fontTitle, fontBody, apelidoFontSize, bodyFontSize });

    // Aplicar fonte de título ao apelido (mas não ao header)
    if (fontTitle) {
        document.querySelectorAll('.sidebar-right .profile-apelido-title, .public-profile-apelido, .author-name, .reply-author').forEach(el => {
            el.style.setProperty('font-family', `'${fontTitle}', sans-serif`, 'important');
        });
    }

    // Aplicar tamanho do apelido no cantinho público
    document.querySelectorAll('.sidebar-right .profile-apelido-title, .public-profile-apelido').forEach(el => {
        el.style.fontSize = `${apelidoFontSize}px`;
    });

    // A fonte de corpo (fontBody) e tamanho são aplicados globalmente via CSS variables no body
    // Não precisa aplicar em elementos específicos
}

// Função para resetar fontes para o padrão
function resetUserFonts() {
    // Resetar CSS variables globais
    document.documentElement.style.removeProperty('--user-font-title');
    document.documentElement.style.removeProperty('--user-font-body');
    document.documentElement.style.removeProperty('--user-apelido-font-size');
    document.documentElement.style.removeProperty('--user-body-font-size');

    const personalCorner = document.querySelector('.sidebar-left');
    if (personalCorner) {
        personalCorner.querySelectorAll('*').forEach(el => {
            el.style.fontFamily = '';
        });
    }

    const publicCorner = document.querySelector('.sidebar-right');
    if (publicCorner) {
        publicCorner.querySelectorAll('*').forEach(el => {
            el.style.fontFamily = '';
        });
    }
}

// Função para atualizar preview de fontes
function updateFontPreview() {
    const fontTitle = document.getElementById('font-title')?.value;
    const fontBody = document.getElementById('font-body')?.value;
    const apelidoFontSize = document.getElementById('apelido-font-size')?.value || 48;
    const bodyFontSize = document.getElementById('body-font-size')?.value || 13;
    const previewTitle = document.getElementById('font-preview-title');
    const previewText = document.getElementById('font-preview-text');

    if (previewTitle) {
        if (fontTitle) {
            previewTitle.style.fontFamily = `'${fontTitle}', sans-serif`;
        } else {
            previewTitle.style.fontFamily = '';
        }
        previewTitle.style.fontSize = `${apelidoFontSize}px`;
    }

    if (previewText) {
        if (fontBody) {
            previewText.style.fontFamily = `'${fontBody}', sans-serif`;
        } else {
            previewText.style.fontFamily = '';
        }
        previewText.style.fontSize = `${bodyFontSize}px`;
    }
}

// Função para carregar e renderizar assuntos fixados
async function loadPinnedAssuntos(profileId) {
    if (!getPinnedAssuntos) return;

    try {
        const pinnedAssuntos = await getPinnedAssuntos(profileId);
        const isOwnProfile = currentUser && profileId === currentUser.id;

        // Renderizar na sidebar esquerda (feed view)
        const sidebarPinnedList = document.getElementById('right-profile-pinned-list');
        const sidebarPinnedCount = document.getElementById('right-profile-pinned-count');
        const sidebarPinnedCard = sidebarPinnedList?.closest('.pinned-topics-card');

        const getPinnedTitle = (texto) => {
            if (!texto) return 'Sem título';
            const div = document.createElement('div');
            div.innerHTML = texto;
            const h1 = div.querySelector('h1');
            if (h1) {
                return h1.textContent.trim() || 'Sem título';
            }
            return (div.textContent || div.innerText || '').trim() || 'Sem título';
        };

        if (sidebarPinnedList) {
            if (pinnedAssuntos.length === 0) {
                sidebarPinnedList.innerHTML = '<li class="pinned-item"><span class="pinned-title">Nenhum assunto fixado</span></li>';
            } else {
                sidebarPinnedList.innerHTML = pinnedAssuntos.map(assunto => `
        <li class="pinned-item clickable" data-assunto-id="${assunto.id}">
            <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 6px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="pinned-title">${escapeHtml(getPinnedTitle(assunto.texto_pt || assunto.texto_en || 'Sem título', assunto.aviso_admin))}</span>
        </li>
    `).join('');
            }
        }

        if (sidebarPinnedCount) {
            sidebarPinnedCount.textContent = `(${pinnedAssuntos.length}/3)`;
        }

        // Esconder card da sidebar se não tiver assuntos fixados
        if (sidebarPinnedCard) {
            if (pinnedAssuntos.length === 0) {
                sidebarPinnedCard.style.display = 'none';
            } else {
                sidebarPinnedCard.style.display = 'block';
            }
        }

        // Adicionar event listeners para clique nos assuntos fixados da sidebar
        sidebarPinnedList?.querySelectorAll('.pinned-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const assuntoId = item.dataset.assuntoId;
                if (assuntoId) {
                    loadPinnedAssuntoToFeed(assuntoId);
                }
            });
        });

        // Renderizar no Cantinho
        const cantinhoPinnedList = document.getElementById('cantinho-pinned-list');
        const cantinhoPinnedCount = document.getElementById('cantinho-pinned-count');
        const cantinhoPinnedCard = cantinhoPinnedList?.closest('.pinned-topics-card');

        if (cantinhoPinnedList) {
            if (pinnedAssuntos.length === 0) {
                cantinhoPinnedList.innerHTML = '<li class="pinned-item"><span class="pinned-title">Nenhum assunto fixado</span></li>';
            } else {
                cantinhoPinnedList.innerHTML = pinnedAssuntos.map(assunto => `
        <li class="pinned-item clickable" data-assunto-id="${assunto.id}">
            <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 6px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="pinned-title">${escapeHtml(getPinnedTitle(assunto.texto_pt || assunto.texto_en || 'Sem título', assunto.aviso_admin))}</span>
        </li>
    `).join('');
            }
        }

        if (cantinhoPinnedCount) {
            cantinhoPinnedCount.textContent = `(${pinnedAssuntos.length}/3)`;
        }

        // Esconder card no cantinho se não tiver assuntos fixados
        if (cantinhoPinnedCard) {
            if (pinnedAssuntos.length === 0) {
                cantinhoPinnedCard.style.display = 'none';
            } else {
                cantinhoPinnedCard.style.display = 'block';
            }
        }

        // Adicionar event listeners para clique nos assuntos fixados do cantinho
        cantinhoPinnedList?.querySelectorAll('.pinned-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const assuntoId = item.dataset.assuntoId;
                if (assuntoId) {
                    loadPinnedAssuntoToFeed(assuntoId);
                }
            });
        });

        // Renderizar no perfil público
        const publicPinnedList = document.getElementById('public-profile-pinned-list');
        const publicPinnedCount = document.getElementById('public-profile-pinned-count');
        const publicPinnedCard = publicPinnedList?.closest('.pinned-topics-card');

        if (publicPinnedList) {
            if (pinnedAssuntos.length === 0) {
                publicPinnedList.innerHTML = '<li class="pinned-item"><span class="pinned-title">Nenhum assunto fixado</span></li>';
            } else {
                publicPinnedList.innerHTML = pinnedAssuntos.map(assunto => `
        <li class="pinned-item clickable" data-assunto-id="${assunto.id}">
            <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 6px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="pinned-title">${escapeHtml(getPinnedTitle(assunto.texto_pt || assunto.texto_en || 'Sem título', assunto.aviso_admin))}</span>
        </li>
    `).join('');
            }
        }

        if (publicPinnedCount) {
            publicPinnedCount.textContent = `(${pinnedAssuntos.length}/3)`;
        }

        // Esconder card no perfil público se não tiver assuntos fixados
        if (publicPinnedCard) {
            if (pinnedAssuntos.length === 0) {
                publicPinnedCard.style.display = 'none';
            } else {
                publicPinnedCard.style.display = 'block';
            }
        }

        // Adicionar event listeners para clique nos assuntos fixados do perfil público
        publicPinnedList?.querySelectorAll('.pinned-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const assuntoId = item.dataset.assuntoId;
                if (assuntoId) {
                    loadPinnedAssuntoToFeed(assuntoId);
                }
            });
        });

    } catch (error) {
        console.error('Erro ao carregar assuntos fixados:', error);
    }
}

// Função para carregar o card do assunto fixado no topo do feed da página atual
async function loadPinnedAssuntoToFeed(assuntoId) {
    if (!supabase) return;

    try {
        // Buscar o assunto completo
        const { data: assunto, error } = await supabase
            .from('assuntos')
            .select('*')
            .eq('id', assuntoId)
            .single();

        if (error) throw error;
        if (!assunto) {
            console.error('Assunto não encontrado:', assuntoId);
            return;
        }

        // Determinar qual feed usar baseado na página atual
        let feedContent = null;
        const feedView = document.getElementById('feed-view');
        const cantinhoView = document.getElementById('cantinho-view');
        const publicProfileView = document.getElementById('public-profile-view');

        if (!feedView.classList.contains('hidden')) {
            feedContent = document.getElementById('feed-content');
        } else if (!cantinhoView.classList.contains('hidden')) {
            feedContent = document.getElementById('cantinho-feed-content');
        } else if (!publicProfileView.classList.contains('hidden')) {
            feedContent = document.getElementById('public-profile-feed-content');
        }

        if (!feedContent) {
            console.error('Nenhum feed encontrado para carregar o assunto');
            return;
        }

        // Verificar se o card já existe no feed
        const existingCard = feedContent.querySelector(`.assunto-card[data-assunto-id="${assuntoId}"]`);
        if (existingCard) {
            // Se já existe, apenas destacar
            existingCard.style.transition = 'box-shadow 0.3s ease';
            existingCard.style.boxShadow = '0 0 0 3px var(--accent-primary)';
            setTimeout(() => {
                existingCard.style.boxShadow = '';
            }, 3000);
            // Rolar até o card
            existingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Buscar o perfil do autor
        const { data: authorProfile } = await supabase
            .from('profiles')
            .select('id, apelido, nome, fotos, username')
            .eq('id', assunto.autor)
            .single();

        assunto.profiles = authorProfile;

        // Criar o card do assunto
        const assuntoCard = await createAssuntoCard(assunto);

        // Adicionar no topo do feed
        feedContent.insertAdjacentHTML('afterbegin', assuntoCard);

        // Destacar o card
        const newCard = feedContent.querySelector('.assunto-card:first-child');
        if (newCard) {
            newCard.style.transition = 'box-shadow 0.3s ease';
            newCard.style.boxShadow = '0 0 0 3px var(--accent-primary)';
            setTimeout(() => {
                newCard.style.boxShadow = '';
            }, 3000);
        }

    } catch (error) {
        console.error('Erro ao carregar assunto fixado:', error);
    }
}

async function bindBetaInvitePanel(profileId) {
    const card = document.getElementById('beta-invites-card');
    const countLabel = document.getElementById('beta-invites-count');
    const createButton = document.getElementById('btn-create-beta-invite');
    const list = document.getElementById('beta-invites-list');
    const isOwner = Boolean(currentUser && currentUser.id === profileId);

    if (!card || !countLabel || !createButton || !list) return;

    card.classList.toggle('hidden', !isOwner);
    if (!isOwner || !getMyBetaInviteCount || !createBetaInvite) return;

    const renderStoredLinks = () => {
        let storedLinks = [];
        try {
            storedLinks = JSON.parse(sessionStorage.getItem('pracinha-beta-invite-links') || '[]');
        } catch (error) {
            storedLinks = [];
        }

        list.innerHTML = '';
        storedLinks.forEach(link => {
            const row = document.createElement('div');
            row.className = 'beta-invite-row';
            row.textContent = link;
            row.title = 'Clique para copiar';
            row.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(link);
                    row.textContent = t('btn.linkCopied', currentLanguage);
                    setTimeout(() => { row.textContent = link; }, 1500);
                } catch (error) {
                    window.prompt('Copie o convite:', link);
                }
            });
            list.appendChild(row);
        });
    };

    const refreshCount = async () => {
        try {
            const count = await getMyBetaInviteCount(profileId);
            countLabel.textContent = `${count}/3`;
            createButton.disabled = count >= 3;
            createButton.textContent = count >= 3 ? t('admin.limitReached', currentLanguage) : t('admin.generateInvite', currentLanguage);
        } catch (error) {
            console.error('Erro ao carregar limite de convites:', error);
            countLabel.textContent = '--/3';
        }
    };

    createButton.onclick = async () => {
        createButton.disabled = true;
        createButton.textContent = t('btn.generating', currentLanguage);

        try {
            const invite = await createBetaInvite();
            if (!invite?.token) throw new Error(t('error.inviteNotReturned', currentLanguage));

            const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(invite.token)}`;
            let storedLinks = [];
            try {
                storedLinks = JSON.parse(sessionStorage.getItem('pracinha-beta-invite-links') || '[]');
            } catch (error) {
                storedLinks = [];
            }
            storedLinks.push(inviteUrl);
            sessionStorage.setItem('pracinha-beta-invite-links', JSON.stringify(storedLinks.slice(-3)));
            renderStoredLinks();
            await navigator.clipboard?.writeText(inviteUrl);
            alert('Convite gerado e copiado. Ele expira em 3 dias e só pode ser usado uma vez.');
        } catch (error) {
            console.error('Erro ao gerar convite:', error);
            alert(error.message || 'Não foi possível gerar o convite.');
        } finally {
            await refreshCount();
        }
    };

    renderStoredLinks();
    await refreshCount();
}

// Navegação mobile
function handleNavigation(page) {
    if (page === 'pracinha') {
        showFeedView();
        return;
    }
    if (page === 'cantinho') {
        goToMyCantinho();
        return;
    }
    if (page === 'visitantes') {
        openUsersModal();
        return;
    }
    if (page === 'settings') {
        showSettingsView();
        return;
    }
    if (page === 'admin') {
        showAdminView();
        return;
    }
    console.log('Navegar para:', page);
}

// ==========================================================================
// FUNÇÕES DO PAINEL ADMIN
// ==========================================================================

let currentUserRole = null;

// Verificar se o usuário tem permissão de admin/moderador
function hasAdminAccess() {
    return currentUserRole === 'admin' || currentUserRole === 'mod';
}

// Mostrar view de Páginas Personalizadas
function showPageView() {
    // Esconder todas as views
    document.getElementById('feed-view').classList.add('hidden');
    document.getElementById('settings-view').classList.add('hidden');
    document.getElementById('cantinho-view').classList.add('hidden');
    document.getElementById('public-profile-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    // Limpar conteúdo da page view antes de mostrar
    const pageContent = document.getElementById('page-content');
    const pageTitle = document.getElementById('page-title');
    const breadcrumb = document.getElementById('page-breadcrumb');
    const sidebarMenu = document.getElementById('page-sidebar-menu');
    
    if (pageContent) pageContent.innerHTML = '';
    if (pageTitle) pageTitle.textContent = '';
    if (breadcrumb) breadcrumb.innerHTML = '';
    if (sidebarMenu) sidebarMenu.classList.add('hidden');

    // Mostrar page view
    const pageView = document.getElementById('page-view');
    pageView.classList.remove('hidden');

    // Atualizar navegação do header
    updateHeaderNavigation();

    // Ir para o topo da página
    window.scrollTo(0, 0);
}

// Carregar sidebar menu com páginas filhas
async function loadSidebarMenu(parentSlug, currentSlugPath) {
    const sidebarNav = document.getElementById('sidebar-menu-nav');
    if (!sidebarNav) return;

    // Limpar o conteúdo anterior do sidebar
    sidebarNav.innerHTML = '';

    try {
        // Buscar página pai
        const { data: parentPage, error: parentError } = await supabase
            .from('paginas')
            .select('*')
            .eq('slug', parentSlug)
            .single();

        if (parentError || !parentPage) {
            console.error('Erro ao buscar página pai:', parentError);
            return;
        }

        // Buscar páginas filhas
        const { data: childPages, error: childError } = await supabase
            .from('paginas')
            .select('*')
            .eq('parent_id', parentPage.id)
            .eq('publicado', true)
            .order('ordem', { ascending: true });

        if (childError) {
            console.error('Erro ao buscar páginas filhas:', childError);
            return;
        }

        // Determinar idioma atual
        const currentLang = window.currentLanguage || 'pt';
        const titleField = currentLang === 'en' ? 'titulo_en' : 'titulo_pt';

        // Renderizar links no sidebar
        let menuHTML = '';
        
        // Link para a página pai
        const parentTitle = parentPage[titleField] || parentPage.titulo_pt;
        menuHTML += `
            <a href="#/page/${parentSlug}" class="sidebar-menu-link ${currentSlugPath === parentSlug ? 'active' : ''}" data-slug="${parentSlug}">
                ${parentTitle}
            </a>
        `;

        // Links para páginas filhas
        if (childPages && childPages.length > 0) {
            menuHTML += '<div class="sidebar-menu-divider"></div>';
            childPages.forEach(page => {
                const pageTitle = page[titleField] || page.titulo_pt;
                const pageSlug = `${parentSlug}/${page.slug}`;
                menuHTML += `
                    <a href="#/page/${pageSlug}" class="sidebar-menu-link sidebar-menu-sublink" data-slug="${pageSlug}">
                        ${pageTitle}
                    </a>
                `;
            });
        }

        sidebarNav.innerHTML = menuHTML;

        // Adicionar event listeners para os links
        sidebarNav.querySelectorAll('.sidebar-menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const slug = link.dataset.slug;
                window.location.hash = `#/page/${slug}`;
            });
        });

    } catch (error) {
        console.error('Erro ao carregar sidebar menu:', error);
    }
}

// Carregar página personalizada por slug
async function loadPage(slugPath) {
    const pageContent = document.getElementById('page-content');
    const pageTitle = document.getElementById('page-title');
    const breadcrumb = document.getElementById('page-breadcrumb');
    const backBtn = document.getElementById('page-back-btn');
    const sidebarMenu = document.getElementById('page-sidebar-menu');
    const pageView = document.getElementById('page-view');

    // Limpar completamente o conteúdo anterior
    if (pageContent) {
        pageContent.innerHTML = '';
    }
    if (pageTitle) {
        pageTitle.textContent = '';
    }
    if (breadcrumb) {
        breadcrumb.innerHTML = '';
    }

    // Mostrar loading
    if (pageContent) {
        pageContent.innerHTML = '<p class="page-loading">Carregando...</p>';
    }

    // Configurar breadcrumb
    const slugs = slugPath.split('/');
    const currentSlug = slugs[slugs.length - 1];
    const parentSlug = slugs.length > 1 ? slugs[0] : currentSlug;

    // Verificar se a página tem sub-páginas para mostrar o sidebar menu
    try {
        const { data: parentPage } = await supabase
            .from('paginas')
            .select('id')
            .eq('slug', parentSlug)
            .single();

        if (parentPage) {
            const { data: hasChildren } = await supabase
                .from('paginas')
                .select('id')
                .eq('parent_id', parentPage.id)
                .eq('publicado', true)
                .limit(1);

            if (hasChildren && hasChildren.length > 0) {
                if (sidebarMenu) {
                    sidebarMenu.classList.remove('hidden');
                    await loadSidebarMenu(parentSlug, slugPath);
                }
                if (pageView) {
                    pageView.classList.add('como-usar-mode');
                }
            } else {
                if (sidebarMenu) {
                    sidebarMenu.classList.add('hidden');
                }
                if (pageView) {
                    pageView.classList.remove('como-usar-mode');
                }
            }
        } else {
            if (sidebarMenu) {
                sidebarMenu.classList.add('hidden');
            }
            if (pageView) {
                pageView.classList.remove('como-usar-mode');
            }
        }
    } catch (error) {
        // Se der erro, não mostra o sidebar menu
        if (sidebarMenu) {
            sidebarMenu.classList.add('hidden');
        }
        if (pageView) {
            pageView.classList.remove('como-usar-mode');
        }
    }
    
    if (slugs.length > 1) {
        // É uma sub-página, breadcrumb mostra hierarquia
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <button class="breadcrumb-back" id="page-back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                    <span data-i18n="nav.back">Voltar</span>
                </button>
                <div class="breadcrumb-path">
                    ${slugs.map((slug, index) => `
                        <span class="breadcrumb-item">${slug}</span>
                        ${index < slugs.length - 1 ? '<span class="breadcrumb-separator">/</span>' : ''}
                    `).join('')}
                </div>
            `;
        }
    } else {
        // É página raiz, breadcrumb simples
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <button class="breadcrumb-back" id="page-back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                    <span data-i18n="nav.back">Voltar</span>
                </button>
            `;
        }
    }

    // Configurar botão voltar
    const newBackBtn = document.getElementById('page-back-btn');
    if (newBackBtn) {
        // Remover event listeners antigos
        const newBtn = newBackBtn.cloneNode(true);
        newBackBtn.parentNode.replaceChild(newBtn, newBackBtn);
        
        // Adicionar novo event listener
        newBtn.addEventListener('click', () => {
            window.location.hash = '#/feed';
        });
    }

    // Buscar página do banco de dados
    try {
        const currentLang = currentLanguage || 'pt-BR';
        
        // Buscar página pelo slug
        const { data: pagina, error } = await supabase
            .from('paginas')
            .select('*')
            .eq('slug', currentSlug)
            .eq('publicado', true)
            .single();

        if (error || !pagina) {
            if (pageContent) {
                pageContent.innerHTML = '<p class="page-error">Página não encontrada.</p>';
            }
            if (pageTitle) {
                pageTitle.textContent = 'Página não encontrada';
            }
            return;
        }

        // Verificar se é a página correta (considerando hierarquia)
        if (slugs.length > 1) {
            // É uma sub-página, verificar se o parent_id corresponde
            const parentSlug = slugs[slugs.length - 2];
            const { data: parentPagina } = await supabase
                .from('paginas')
                .select('id')
                .eq('slug', parentSlug)
                .single();
            
            if (!parentPagina || pagina.parent_id !== parentPagina.id) {
                if (pageContent) {
                    pageContent.innerHTML = '<p class="page-error">Página não encontrada.</p>';
                }
                if (pageTitle) {
                    pageTitle.textContent = 'Página não encontrada';
                }
                return;
            }
        } else if (pagina.parent_id) {
            // É uma página raiz mas tem parent_id, não deve ser acessada diretamente
            if (pageContent) {
                pageContent.innerHTML = '<p class="page-error">Página não encontrada.</p>';
            }
            if (pageTitle) {
                pageTitle.textContent = 'Página não encontrada';
            }
            return;
        }

        // Renderizar conteúdo
        const titulo = currentLang === 'pt-BR' ? pagina.titulo_pt : pagina.titulo_en;
        const conteudo = currentLang === 'pt-BR' ? pagina.conteudo_pt : pagina.conteudo_en;

        if (pageTitle) {
            pageTitle.textContent = titulo;
        }
        if (pageContent) {
            pageContent.innerHTML = conteudo || '<p class="page-empty">Sem conteúdo.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        if (pageContent) {
            pageContent.innerHTML = '<p class="page-error">Erro ao carregar página.</p>';
        }
        if (pageTitle) {
            pageTitle.textContent = 'Erro ao carregar página';
        }
    }
}

// Mostrar view de Admin
function showAdminView() {
    if (!hasAdminAccess()) {
        alert('Acesso negado. Você não tem permissão para acessar esta página.');
        return;
    }

    window.location.hash = '#/admin';

    // Esconder todas as views
    document.getElementById('feed-view').classList.add('hidden');
    document.getElementById('settings-view').classList.add('hidden');
    document.getElementById('cantinho-view').classList.add('hidden');
    document.getElementById('public-profile-view').classList.add('hidden');
    document.getElementById('page-view').classList.add('hidden');

    // Mostrar admin view
    const adminView = document.getElementById('admin-view');
    adminView.classList.remove('hidden');

    // Atualizar navegação do header
    updateHeaderNavigation();

    // Garantir que o admin view esteja no topo
    adminView.style.marginTop = '0';
    adminView.style.paddingTop = '0';
    adminView.style.position = 'relative';
    adminView.style.top = '0';

    // Remover padding do main-content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.padding = '0';
        mainContent.style.marginTop = '0';
    }

    // Remover padding/margin do main-screen
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
        mainScreen.style.paddingTop = '0';
        mainScreen.style.marginTop = '0';
    }

    // Ir para o topo da página imediatamente
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    // Configurar navegação do admin (garantir que os event listeners estejam ativos)
    setupAdminNavigation();

    // Carregar dados do admin
    loadAdminDashboard();

    // Mostrar botões admin-only se for admin
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(el => {
        el.style.display = currentUserRole === 'admin' ? 'flex' : 'none';
    });

    // Atualizar URL
    window.location.hash = '#/admin';

    // Forçar scroll novamente após um pequeno delay
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}

// Carregar dashboard stats
async function loadAdminDashboard() {
    try {
        // Total de usuários
        const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        document.getElementById('stat-total-users').textContent = userCount || 0;

        // Posts ativos
        const { count: activePosts } = await supabase
            .from('assuntos')
            .select('*', { count: 'exact', head: true })
            .gt('expira_em', new Date().toISOString());

        document.getElementById('stat-active-posts').textContent = activePosts || 0;

        // Posts hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: postsToday } = await supabase
            .from('assuntos')
            .select('*', { count: 'exact', head: true })
            .gte('criado_em', today.toISOString());

        document.getElementById('stat-posts-today').textContent = postsToday || 0;

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Carregar lista de usuários
async function loadAdminUsers() {
    try {
        const search = document.getElementById('admin-user-search')?.value || '';
        const roleFilter = document.getElementById('admin-user-role-filter')?.value || 'all';

        let query = supabase
            .from('profiles')
            .select('id, nome, username, role, fotos, ban_until, silence_until');

        if (search) {
            query = query.or(`nome.ilike.%${search}%,username.ilike.%${search}%`);
        }

        if (roleFilter !== 'all') {
            query = query.eq('role', roleFilter);
        }

        const { data: users, error } = await query;

        if (error) throw error;

        const now = new Date();

        const tbody = document.getElementById('admin-users-table');
        tbody.innerHTML = users.map(user => {
            const isBanned = user.ban_until && new Date(user.ban_until) > now;
            const isSilenced = user.silence_until && new Date(user.silence_until) > now;

            let status = '<span class="status-badge status-normal">Normal</span>';
            if (isBanned) {
                status = '<span class="status-badge status-banned">Banido</span>';
            } else if (isSilenced) {
                status = '<span class="status-badge status-silenced">Silenciado</span>';
            }

            return `
            <tr>
    <td>
        <div style="display: flex; align-items: center; gap: 8px;">
            ${user.fotos?.[0]
                    ? `<img src="${user.fotos[0]}" alt="${user.nome}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                    : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-subtle); display: flex; align-items: center; justify-content: center;">${user.nome?.charAt(0) || 'U'}</div>`
                }
            ${user.nome || 'Sem nome'}
        </div>
    </td>
    <td>@${user.username || '-'}</td>
    <td><span class="role-badge role-${user.role || 'user'}">${user.role || 'user'}</span></td>
    <td>${status}</td>
    <td>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${currentUserRole === 'admin' || currentUserRole === 'mod' ? `
                ${currentUserRole === 'admin' ? `
                    <button type="button" class="btn btn-small" onclick="changeUserRole('${user.id}', '${user.role || 'user'}')">Role</button>
                ` : ''}
                ${isBanned ? `
                    <button type="button" class="btn btn-small btn-success" onclick="unbanUser('${user.id}')">Desbanir</button>
                ` : `
                    <button type="button" class="btn btn-small btn-danger" onclick="banUser('${user.id}')">Banir</button>
                `}
                ${isSilenced ? `
                    <button type="button" class="btn btn-small btn-success" onclick="unsilenceUser('${user.id}')">Desilenciar</button>
                ` : `
                    <button type="button" class="btn btn-small btn-warning" onclick="silenceUser('${user.id}')">Silenciar</button>
                `}
            ` : ''}
        </div>
    </td>
            </tr>
        `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('admin-users-table').innerHTML = '<tr><td colspan="5">' + t('admin.errorLoadUsersList', currentLanguage) + '</td></tr>';
    }
}

// Desbanir usuário
async function unbanUser(userId) {
    if (!confirm(t('confirm.unbanUser', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ ban_until: null })
            .eq('id', userId);

        if (error) throw error;

        alert(t('admin.unbanned', currentLanguage));
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
        alert(t('admin.errorUnbanUser', currentLanguage));
    }
}

// Desilenciar usuário
async function unsilenceUser(userId) {
    if (!confirm(t('confirm.unsilenceUser', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ silence_until: null })
            .eq('id', userId);

        if (error) throw error;

        alert(t('admin.unsilenced', currentLanguage));
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao desilenciar usuário:', error);
        alert(t('admin.errorUnsilenceUser', currentLanguage));
    }
}

// Carregar fotos do usuário
async function loadUserPhotos(userId) {
    const cantinhoPhotosGrid = document.getElementById('cantinho-photos-grid');
    const cantinhoPhotosCount = document.getElementById('cantinho-photos-count');
    const rightPhotosGrid = document.getElementById('right-profile-photos-grid');
    const rightPhotosCount = document.getElementById('right-profile-photos-count');

    if (!cantinhoPhotosGrid && !rightPhotosGrid) return;

    try {
        const { data: photos, error } = await supabase
            .from('user_photos')
            .select('id, url')
            .eq('user_id', userId)
            .eq('ativo', true)
            .order('criado_em', { ascending: false });

        if (error) throw error;

        const isOwnProfile = currentUser && userId === currentUser.id;

        // Renderizar no cantinho
        if (cantinhoPhotosGrid) {
            renderPhotosGrid(cantinhoPhotosGrid, photos, isOwnProfile, userId, cantinhoPhotosCount, 'cantinho');
        }

        // Renderizar na sidebar direita (feed) - apenas se for o próprio perfil
        if (rightPhotosGrid && isOwnProfile) {
            renderPhotosGrid(rightPhotosGrid, photos, isOwnProfile, userId, rightPhotosCount, 'feed');
        } else if (rightPhotosGrid && !isOwnProfile) {
            // Se não for o próprio perfil, limpar o grid do feed
            rightPhotosGrid.innerHTML = '';
            if (rightPhotosCount) rightPhotosCount.textContent = '(0/6)';
        }

    } catch (error) {
        console.error('Erro ao carregar fotos:', error);
        if (cantinhoPhotosGrid) cantinhoPhotosGrid.innerHTML = '';
        if (rightPhotosGrid) rightPhotosGrid.innerHTML = '';
    }
}

// Renderizar grade de fotos
function renderPhotosGrid(gridElement, photos, isOwnProfile, userId, countElement, context = 'cantinho') {
    const photosCard = gridElement.closest('.user-photos-card');
    const addPhotoBtnId = context === 'feed' ? 'btn-add-photo-right' : 'btn-add-cantinho-photo';
    const addPhotoBtn = gridElement.parentElement.querySelector(`#${addPhotoBtnId}`);

    // Esconder botão de adicionar se não for dono
    if (addPhotoBtn) {
        addPhotoBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    }

    // Se não for dono e não tiver fotos, esconder o card inteiro
    if (!isOwnProfile && (!photos || photos.length === 0)) {
        if (photosCard) {
            photosCard.style.display = 'none';
        }
        return;
    }

    // Mostrar o card se tiver fotos ou for dono
    if (photosCard) {
        photosCard.style.display = 'block';
    }

    if (photos && photos.length > 0) {
        gridElement.innerHTML = photos.map(photo => `
            <div class="grid-photo-item" data-photo-id="${photo.id}" data-photo-url="${photo.url}">
    <img src="${photo.url}" alt="Foto" class="avatar-clickable" data-photo-url="${photo.url}">
    ${isOwnProfile ? `<button type="button" class="remove-photo-btn" data-photo-id="${photo.id}" title="Remover foto">&times;</button>` : ''}
            </div>
        `).join('');

        // Adicionar placeholders se tiver menos de 6 fotos
        if (photos.length < 6 && isOwnProfile) {
            gridElement.innerHTML += `<div class="grid-photo-placeholder"></div>`.repeat(6 - photos.length);
        }
    } else if (isOwnProfile) {
        gridElement.innerHTML = `<div class="grid-photo-placeholder"></div>`.repeat(6);
    } else {
        gridElement.innerHTML = '';
    }

    if (countElement) {
        const count = photos ? photos.length : 0;
        countElement.textContent = isOwnProfile ? `(${count}/6)` : `(${count})`;
    }

    // Adicionar event listeners para remover fotos
    if (isOwnProfile) {
        gridElement.querySelectorAll('.remove-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = btn.dataset.photoId;
                removeUserPhoto(photoId, userId);
            });
        });
    }

    // Adicionar event listeners para abrir lightbox
    gridElement.querySelectorAll('.grid-photo-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-photo-btn')) {
                const photoUrl = item.dataset.photoUrl;
                const photoId = item.dataset.photoId;
                openPhotoLightbox(photos, photoId, isOwnProfile, userId);
            }
        });
    });
}

// Upload de foto do usuário
async function uploadUserPhoto(file) {
    if (!currentUser) {
        alert('Você precisa estar logado para adicionar fotos.');
        return;
    }

    // Verificar se já tem 6 fotos
    const { data: existingPhotos, error: countError } = await supabase
        .from('user_photos')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('ativo', true);

    if (countError) throw countError;

    if (existingPhotos && existingPhotos.length >= 6) {
        alert('Você já atingiu o limite de 6 fotos.');
        return;
    }

    try {
        // Abrir modal de crop com opção 1:1
        const croppedBlob = await openAvatarCropModal(file, 'square');
        if (!croppedBlob) return;

        // Upload para storage
        const filePath = `${currentUser.id}/photo-${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
            .from('fotos')
            .upload(filePath, croppedBlob);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('fotos')
            .getPublicUrl(filePath);

        // Inserir no banco
        const { error: insertError } = await supabase
            .from('user_photos')
            .insert({
                user_id: currentUser.id,
                url: publicUrl,
                ativo: true
            });

        if (insertError) throw insertError;

        // Recarregar fotos
        await loadUserPhotos(currentUser.id);

    } catch (error) {
        console.error('Erro ao fazer upload de foto:', error);
        alert(t('error.uploadPhotoRetry', currentLanguage) + (error.message || ''));
    }
}

// Remover foto do usuário
async function removeUserPhoto(photoId, userId) {
    if (!currentUser || userId !== currentUser.id) {
        alert(t('error.onlyOwnPhotos', currentLanguage));
        return;
    }

    if (!confirm(t('confirm.removePhoto', currentLanguage))) return;

    try {
        // Marcar como inativa em vez de deletar
        const { error } = await supabase
            .from('user_photos')
            .update({ ativo: false })
            .eq('id', photoId)
            .eq('user_id', userId);

        if (error) throw error;

        // Recarregar fotos
        await loadUserPhotos(userId);

    } catch (error) {
        console.error('Erro ao remover foto:', error);
        alert(t('error.removePhoto', currentLanguage) + (error.message || ''));
    }
}

// Lightbox de fotos
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;
let currentLightboxUserId = null;
let currentLightboxIsOwner = false;

function openPhotoLightbox(photos, photoId, isOwner, userId) {
    currentLightboxPhotos = photos;
    currentLightboxIndex = photos.findIndex(p => p.id === photoId);
    currentLightboxUserId = userId;
    currentLightboxIsOwner = isOwner;

    if (currentLightboxIndex === -1) return;

    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxDelete = document.getElementById('lightbox-delete');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    lightbox.classList.remove('hidden');
    lightboxImage.src = photos[currentLightboxIndex].url;
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${photos.length}`;

    // Mostrar botão de deletar apenas se for dono
    if (isOwner) {
        lightboxDelete.classList.remove('hidden');
    } else {
        lightboxDelete.classList.add('hidden');
    }

    // Atualizar estado dos botões de navegação
    updateLightboxNavButtons();

    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';
}

function closePhotoLightbox() {
    const lightbox = document.getElementById('photo-lightbox');
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';

    currentLightboxPhotos = [];
    currentLightboxIndex = 0;
    currentLightboxUserId = null;
    currentLightboxIsOwner = false;
}

function updateLightboxNavButtons() {
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    lightboxPrev.disabled = currentLightboxIndex === 0;
    lightboxNext.disabled = currentLightboxIndex === currentLightboxPhotos.length - 1;
}

function navigateLightbox(direction) {
    const newIndex = currentLightboxIndex + direction;

    if (newIndex < 0 || newIndex >= currentLightboxPhotos.length) return;

    currentLightboxIndex = newIndex;

    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCounter = document.getElementById('lightbox-counter');

    lightboxImage.src = currentLightboxPhotos[currentLightboxIndex].url;
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxPhotos.length}`;

    updateLightboxNavButtons();
}

async function deleteCurrentLightboxPhoto() {
    if (!currentLightboxIsOwner) return;

    const photoId = currentLightboxPhotos[currentLightboxIndex].id;

    if (!confirm(t('confirm.removePhoto', currentLanguage))) return;

    try {
        const { error } = await supabase
            .from('user_photos')
            .update({ ativo: false })
            .eq('id', photoId)
            .eq('user_id', currentLightboxUserId);

        if (error) throw error;

        // Remover foto da lista atual
        currentLightboxPhotos.splice(currentLightboxIndex, 1);

        // Se não tiver mais fotos, fechar lightbox
        if (currentLightboxPhotos.length === 0) {
            closePhotoLightbox();
            await loadUserPhotos(currentLightboxUserId);
            return;
        }

        // Ajustar índice se necessário
        if (currentLightboxIndex >= currentLightboxPhotos.length) {
            currentLightboxIndex = currentLightboxPhotos.length - 1;
        }

        // Atualizar lightbox
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCounter = document.getElementById('lightbox-counter');

        lightboxImage.src = currentLightboxPhotos[currentLightboxIndex].url;
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxPhotos.length}`;

        updateLightboxNavButtons();

        // Recarregar fotos
        await loadUserPhotos(currentLightboxUserId);

    } catch (error) {
        console.error('Erro ao remover foto:', error);
        alert(t('error.removePhoto', currentLanguage) + (error.message || ''));
    }
}

// Banir usuário
async function banUser(userId) {
    const days = prompt(t('admin.banUserPrompt', currentLanguage));
    if (days === null) return;

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 0) {
        alert(t('error.invalidDays', currentLanguage));
        return;
    }

    let banUntil = null;
    if (daysNum > 0) {
        banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + daysNum);
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ ban_until: banUntil })
            .eq('id', userId);

        if (error) throw error;

        alert(daysNum === 0 ? t('admin.bannedPermanently', currentLanguage) : t('admin.bannedForDays', currentLanguage, {n: daysNum}));
        loadAdminUsers();
        loadAdminRoles();
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        alert(t('admin.errorBanUser', currentLanguage));
    }
}

// Silenciar usuário
async function silenceUser(userId) {
    const days = prompt(t('admin.silenceUserPrompt', currentLanguage));
    if (days === null) return;

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) {
        alert(t('error.invalidDays', currentLanguage));
        return;
    }

    const silenceUntil = new Date();
    silenceUntil.setDate(silenceUntil.getDate() + daysNum);

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ silence_until: silenceUntil })
            .eq('id', userId);

        if (error) throw error;

        alert(t('admin.silencedForDays', currentLanguage, {n: daysNum}));
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao silenciar usuário:', error);
        alert(t('admin.errorSilenceUser', currentLanguage));
    }
}

// Remover cargo (setar para 'user')
async function removeRole(userId) {
    if (!confirm('Tem certeza que deseja remover o cargo deste usuário? Ele voltará a ser um usuário comum.')) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);

        if (error) throw error;

        alert(t('admin.roleRemoved', currentLanguage));
        loadAdminRoles();
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao remover cargo:', error);
        alert(t('admin.errorRemoveRole', currentLanguage));
    }
}

// Carregar tabela de tags
async function loadAdminTags() {
    if (!getAllTags) return;

    try {
        const tags = await getAllTags();
        const tagsTable = document.getElementById('admin-tags-table');

        if (!tagsTable) return;

        if (tags.length === 0) {
            tagsTable.innerHTML = '<tr><td colspan="4" class="table-loading">Nenhuma tag encontrada.</td></tr>';
            return;
        }

        tagsTable.innerHTML = tags.map(tag => `
            <tr>
    <td>${escapeHtml(tag.emoji)}</td>
    <td>${escapeHtml(tag.nome)}</td>
    <td><code>${escapeHtml(tag.slug)}</code></td>
    <td>
        <button type="button" class="btn btn-small btn-danger" onclick="handleDeleteTag('${tag.id}')">Deletar</button>
    </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar tags:', error);
        const tagsTable = document.getElementById('admin-tags-table');
        if (tagsTable) {
            tagsTable.innerHTML = '<tr><td colspan="4" class="table-loading">Erro ao carregar tags.</td></tr>';
        }
    }
}

// Criar nova tag
async function handleCreateTag() {
    if (!createTag) {
        alert(t('error.functionUnavailableSupabase', currentLanguage));
        return;
    }

    const nameInput = document.getElementById('tag-name-input');
    const emojiInput = document.getElementById('tag-emoji-input');

    const nome = nameInput?.value?.trim();
    const emoji = emojiInput?.value?.trim();

    if (!nome || !emoji) {
        alert(t('error.tagRequired', currentLanguage));
        return;
    }

    try {
        await createTag(nome, emoji);

        alert(t('success.tagCreated', currentLanguage));

        if (nameInput) nameInput.value = '';
        if (emojiInput) emojiInput.value = '';

        // Recarregar cache de tags
        if (getAllTags) {
            tagsCache = await getAllTags();
            populateTagSelect();
        }

        loadAdminTags();

    } catch (error) {
        console.error('Erro ao criar tag:', error);
        alert(t('error.createTag', currentLanguage) + error.message);
    }
}

// Deletar tag
async function handleDeleteTag(tagId) {
    if (!deleteTag) {
        alert(t('error.functionUnavailableSupabase', currentLanguage));
        return;
    }

    if (!confirm(t('confirm.deleteTag', currentLanguage))) {
        return;
    }

    try {
        await deleteTag(tagId);

        alert(t('admin.tagDeleted', currentLanguage));

        // Recarregar cache de tags
        if (getAllTags) {
            tagsCache = await getAllTags();
            populateTagSelect();
        }

        loadAdminTags();

    } catch (error) {
        console.error('Erro ao deletar tag:', error);
        alert('Erro ao deletar tag: ' + error.message);
    }
}

// Carregar tabela de roles (admin only) - apenas Admin e Moderator
async function loadAdminRoles() {
    if (currentUserRole !== 'admin') return;

    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, nome, username, role')
            .in('role', ['admin', 'mod']);

        if (error) throw error;

        const tbody = document.getElementById('admin-roles-table');
        tbody.innerHTML = users.map(user => `
            <tr>
    <td>${user.nome || 'Sem nome'}</td>
    <td>@${user.username || '-'}</td>
    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
    <td>
        <select class="role-select" data-user-id="${user.id}">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="mod" ${user.role === 'mod' ? 'selected' : ''}>Mod</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
    </td>
    <td>
        <button type="button" class="btn btn-small btn-primary" onclick="saveUserRole('${user.id}')">Salvar</button>
        <button type="button" class="btn btn-small btn-danger" onclick="removeRole('${user.id}')">Remover Cargo</button>
    </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar roles:', error);
        document.getElementById('admin-roles-table').innerHTML = '<tr><td colspan="5">Erro ao carregar roles</td></tr>';
    }
}

// Alterar role de usuário
async function changeUserRole(userId, currentRole) {
    const newRole = prompt('Novo role (user, mod, admin):', currentRole);
    if (!newRole || !['user', 'mod', 'admin'].includes(newRole)) {
        alert('Role inválido. Use: user, mod ou admin');
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            console.error('Erro Supabase:', error);
            throw error;
        }

        alert(t('admin.roleUpdated', currentLanguage));
        loadAdminUsers();
        loadAdminRoles();

    } catch (error) {
        console.error('Erro ao alterar role:', error);
        alert(t('error.changeRole', currentLanguage));
    }
}

// Salvar role de usuário (da tabela de roles)
async function saveUserRole(userId) {
    const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
    const newRole = select?.value;

    if (!newRole) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;

        alert(t('admin.roleUpdated', currentLanguage));
        loadAdminUsers();

    } catch (error) {
        console.error('Erro ao salvar role:', error);
        alert(t('error.saveRole', currentLanguage));
    }
}

// Escanear imagens órfãs
async function scanOrphanedImages() {
    if (!scanOrphanedImagesRPC) {
        alert(t('error.functionUnavailableSupabase', currentLanguage));
        return;
    }

    try {
        const orphanedImages = await scanOrphanedImagesRPC();

        document.getElementById('orphaned-images-result').classList.remove('hidden');

        if (orphanedImages.length === 0) {
            document.getElementById('orphaned-count').textContent = t('admin.noOrphanedImages', currentLanguage);
            document.getElementById('orphaned-images-list').innerHTML = '<p>' + t('admin.allImagesUsed', currentLanguage) + '</p>';
            document.getElementById('btn-delete-orphaned-images').classList.add('hidden');
        } else {
            document.getElementById('orphaned-count').textContent = t('admin.orphanedImagesFound', currentLanguage, {n: orphanedImages.length});

            const totalSize = orphanedImages.reduce((sum, img) => sum + (img.size || 0), 0);
            const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

            document.getElementById('orphaned-images-list').innerHTML = `
    <p>" + t('admin.totalMB', currentLanguage, {size: sizeInMB}) + "</p>"
    <ul style="max-height: 200px; overflow-y: auto; margin-top: 8px;">
        ${orphanedImages.map(img => `
            <li style="font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--border-color);">
                ${escapeHtml(img.path)} (${((img.size || 0) / 1024).toFixed(1)} KB)
            </li>
        `).join('')}
    </ul>
            `;
            document.getElementById('btn-delete-orphaned-images').classList.remove('hidden');
        }

    } catch (error) {
        console.error('Erro ao escanear imagens:', error);
        alert(t('error.scanImages', currentLanguage) + error.message);
    }
}

// Deletar posts expirados não fixados
async function handleDeleteExpiredPosts() {
    if (!deleteExpiredPosts) {
        alert(t('error.functionUnavailableSupabase', currentLanguage));
        return;
    }

    if (!confirm(t('confirm.deleteExpiredPosts', currentLanguage))) {
        return;
    }

    try {
        const deletedCount = await deleteExpiredPosts();

        document.getElementById('expired-posts-result').classList.remove('hidden');
        document.getElementById('expired-posts-count').textContent = t('admin.postsDeleted', currentLanguage, {n: deletedCount});

        alert(t('admin.expiredPostsDeleted', currentLanguage, {n: deletedCount}));

        // Recarregar dashboard para atualizar estatísticas
        loadAdminDashboard();

    } catch (error) {
        console.error('Erro ao deletar posts expirados:', error);
        alert(t('error.deleteExpiredPosts', currentLanguage) + error.message);
    }
}

// Deletar imagens órfãs
async function handleDeleteOrphanedImages() {
    if (!deleteImageFromStorage || !scanOrphanedImagesRPC) {
        alert(t('error.functionUnavailableSupabase', currentLanguage));
        return;
    }

    try {
        // Primeiro, escanear novamente para ter a lista atualizada
        const orphanedImages = await scanOrphanedImagesRPC();

        if (orphanedImages.length === 0) {
            alert(t('admin.noOrphanedImagesToDelete', currentLanguage));
            return;
        }

        if (!confirm(t('confirm.deleteOrphanedImages', currentLanguage, {n: orphanedImages.length}))) {
            return;
        }

        let deletedCount = 0;
        let errors = [];

        // Deletar cada imagem usando Storage API
        for (const img of orphanedImages) {
            try {
                await deleteImageFromStorage(img.path);
                deletedCount++;
            } catch (error) {
                console.error('Erro ao deletar imagem:', img.path, error);
                errors.push(img.path);
            }
        }

        document.getElementById('orphaned-count').textContent = `${deletedCount} imagens deletadas`;

        if (errors.length > 0) {
            document.getElementById('orphaned-images-list').innerHTML = `
    <p>${deletedCount} imagens deletadas com sucesso.</p>
    <p>${errors.length} erros:</p>
    <ul style="max-height: 200px; overflow-y: auto; margin-top: 8px;">
        ${errors.map(path => `<li style="font-size: 12px; padding: 4px 0;">${escapeHtml(path)}</li>`).join('')}
    </ul>
            `;
        } else {
            document.getElementById('orphaned-images-list').innerHTML = '<p>Todas as imagens órfãs foram deletadas com sucesso.</p>';
        }

        document.getElementById('btn-delete-orphaned-images').classList.add('hidden');

        alert(`${deletedCount} imagens órfãs foram deletadas com sucesso.${errors.length > 0 ? ` ${errors.length} erros ocorreram.` : ''}`);

    } catch (error) {
        console.error('Erro ao deletar imagens órfãs:', error);
        alert('Erro ao deletar imagens órfãs: ' + error.message);
    }
}

// Navegação entre seções do admin
function setupAdminNavigation() {
    const navButtons = document.querySelectorAll('.admin-nav-btn');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.adminSection;

            // Atualizar botões ativos
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mostrar seção correspondente
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`admin-${section}`);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Carregar dados da seção
            if (section === 'dashboard') loadAdminDashboard();
            if (section === 'users') loadAdminUsers();
            if (section === 'roles') loadAdminRoles();
            if (section === 'tags') loadAdminTags();
            if (section === 'anuncios') loadAdminAnuncios();
            if (section === 'paginas') loadAdminPaginas();
            if (section === 'siteconfig') loadAdminSiteConfig();
        });
    });

    // Busca de usuários
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadAdminUsers, 300));
    }

    // Filtro de role
    const roleFilter = document.getElementById('admin-user-role-filter');
    if (roleFilter) {
        roleFilter.addEventListener('change', loadAdminUsers);
    }

    // Botão escanear imagens
    const scanBtn = document.getElementById('btn-scan-orphaned-images');
    if (scanBtn) {
        scanBtn.addEventListener('click', scanOrphanedImages);
    }

    // Botão deletar imagens órfãs
    const deleteOrphanedBtn = document.getElementById('btn-delete-orphaned-images');
    if (deleteOrphanedBtn) {
        deleteOrphanedBtn.addEventListener('click', handleDeleteOrphanedImages);
    }

    // Botão deletar posts expirados
    const deleteExpiredBtn = document.getElementById('btn-delete-expired-posts');
    if (deleteExpiredBtn) {
        deleteExpiredBtn.addEventListener('click', handleDeleteExpiredPosts);
    }

    // Botão adicionar foto do cantinho
    const addPhotoBtn = document.getElementById('btn-add-cantinho-photo');
    const photoUploadInput = document.getElementById('cantinho-photo-upload');
    if (addPhotoBtn && photoUploadInput) {
        addPhotoBtn.addEventListener('click', () => {
            photoUploadInput.click();
        });

        photoUploadInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            for (const file of files) {
                await uploadUserPhoto(file);
            }

            photoUploadInput.value = '';
        });
    }

    // Botão adicionar foto na sidebar direita (feed view)
    const addPhotoRightBtn = document.getElementById('btn-add-photo-right');
    const photoUploadRightInput = document.getElementById('right-profile-photo-upload');
    if (addPhotoRightBtn && photoUploadRightInput) {
        addPhotoRightBtn.addEventListener('click', () => {
            photoUploadRightInput.click();
        });

        photoUploadRightInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            for (const file of files) {
                await uploadUserPhoto(file);
            }

            photoUploadRightInput.value = '';
        });
    }

    // Botão criar tag
    const createTagBtn = document.getElementById('btn-create-tag');
    if (createTagBtn) {
        createTagBtn.addEventListener('click', handleCreateTag);
    }

    // Lightbox de fotos
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxDelete = document.getElementById('lightbox-delete');

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closePhotoLightbox);
    }

    if (lightboxBackdrop) {
        lightboxBackdrop.addEventListener('click', closePhotoLightbox);
    }

    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', () => navigateLightbox(1));
    }

    if (lightboxDelete) {
        lightboxDelete.addEventListener('click', deleteCurrentLightboxPhoto);
    }

    // Navegação com teclado no lightbox
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('photo-lightbox');
        if (lightbox.classList.contains('hidden')) return;

        if (e.key === 'Escape') {
            closePhotoLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });
}

// Função debounce para busca
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Função para configurar a seção de MBTI
function setupMBTISection() {
    const discoverySection = document.getElementById('mbti-discovery-section');
    const resultDisplay = document.getElementById('mbti-result-display');
    const manualInput = document.getElementById('mbti-manual-input');
    const mbtiDisplayType = document.getElementById('mbti-display-type');
    const visibilitySection = document.getElementById('mbti-visibility-section');
    const showMbtiCheckbox = document.getElementById('show-mbti');
    
    if (!discoverySection || !resultDisplay || !manualInput) return;
    
    // Verificar se o usuário já tem MBTI salvo
    if (currentProfile && currentProfile.mbti) {
        // Mostrar resultado salvo
        discoverySection.classList.add('hidden');
        resultDisplay.classList.remove('hidden');
        manualInput.classList.add('hidden');

        // Mostrar checkbox de visibilidade
        if (visibilitySection) {
            visibilitySection.classList.remove('hidden');
        }
        
        // Configurar checkbox de visibilidade
        if (showMbtiCheckbox) {
            showMbtiCheckbox.checked = currentProfile.show_mbti !== false;
        }
        
        if (mbtiDisplayType) {
            mbtiDisplayType.textContent = currentProfile.mbti;
        }
        
        // Adicionar evento de clique para mostrar detalhes
        resultDisplay.onclick = () => {
            // Usar window para acessar a função do mbti-test.js
            if (window.showMBTIResultDetail && typeof window.showMBTIResultDetail === 'function') {
                window.showMBTIResultDetail();
            }
        };
    } else {
        // Mostrar seção de descoberta
        discoverySection.classList.remove('hidden');
        resultDisplay.classList.add('hidden');
        manualInput.classList.add('hidden');

        // Esconder checkbox de visibilidade
        if (visibilitySection) {
            visibilitySection.classList.add('hidden');
        }
    }
    
    // Configurar botão de descobrir MBTI
    const discoverBtn = document.getElementById('btn-discover-mbti');
    if (discoverBtn) {
        discoverBtn.onclick = () => {
            if (window.openMBTITest && typeof window.openMBTITest === 'function') {
                window.openMBTITest();
            }
        };
    }
    
    // Configurar botão de adicionar manualmente
    const manualBtn = document.getElementById('btn-add-mbti-manual');
    if (manualBtn) {
        manualBtn.onclick = () => {
            discoverySection.classList.add('hidden');
            manualInput.classList.remove('hidden');
            
            // Mostrar checkbox de visibilidade também ao adicionar manualmente
            if (visibilitySection) {
                visibilitySection.classList.remove('hidden');
            }
        };
    }
    
    // Configurar botão de fechar do modal de teste
    const closeTestBtn = document.getElementById('mbti-test-close');
    if (closeTestBtn) {
        closeTestBtn.onclick = () => {
            if (window.closeMBTITest && typeof window.closeMBTITest === 'function') {
                window.closeMBTITest();
            }
        };
    }
}

// Função para atualizar o mostrário do perfil nas configurações em tempo real
function updateSettingsProfilePreview() {
    if (!currentProfile) return;

    // Criar objeto temporário com os valores do formulário
    const previewProfile = {
        ...currentProfile,
        apelido: document.getElementById('profile-apelido')?.value || currentProfile.apelido,
        nome: document.getElementById('profile-nome')?.value || currentProfile.nome,
        username: document.getElementById('profile-username')?.value || currentProfile.username,
        bio: document.getElementById('profile-bio')?.value || currentProfile.bio,
        local: document.getElementById('profile-local')?.value || currentProfile.local,
        data_nascimento: document.getElementById('profile-data-nascimento')?.value || currentProfile.data_nascimento,
        genero: document.getElementById('profile-genero')?.value || currentProfile.pronomes,
        sexualidade: document.getElementById('profile-sexualidade')?.value || currentProfile.sexualidade,
        site_url: document.getElementById('profile-site')?.value || currentProfile.site_url,
        fotos: currentProfile.fotos,
        show_name: document.getElementById('show-name')?.checked,
        show_bio: document.getElementById('show-bio')?.checked,
        show_local: document.getElementById('show-local')?.checked,
        show_idade: document.getElementById('show-idade')?.checked,
        show_pronomes: document.getElementById('show-pronomes')?.checked,
        show_sexualidade: document.getElementById('show-sexualidade')?.checked,
        show_site: document.getElementById('show-site')?.checked,
        font_title: document.getElementById('font-title')?.value || currentProfile.font_title,
        font_body: document.getElementById('font-body')?.value || currentProfile.font_body,
        apelido_font_size: parseInt(document.getElementById('apelido-font-size')?.value) || currentProfile.apelido_font_size || 48,
        body_font_size: parseInt(document.getElementById('body-font-size')?.value) || currentProfile.body_font_size || 13
    };

    // Atualizar o card de perfil do mostrário
    updateProfileCard(previewProfile, 'settings-preview', { isOwner: false });

    // Aplicar fontes ao mostrário (apenas no container específico)
    applyUserFonts(previewProfile, '#settings-profile-preview');
}

// Injetar cards de perfil nos containers
document.addEventListener('DOMContentLoaded', () => {
    injectProfileCard('feed-profile-card-container', 'right-profile');
    injectProfileCard('cantinho-profile-card-container', 'cantinho');
    injectProfileCard('public-profile-card-container', 'public-profile');
    injectProfileCard('profile-preview-content', 'settings-preview');
});

// Expor funções globalmente para onclick no HTML
window.toggleLanguage = toggleLanguage;
window.goToProfile = goToProfile;
window.goToMyCantinho = goToMyCantinho;
window.goToSettings = goToSettings;
window.openAvatarUpload = openAvatarUpload;
window.goToCantinho = goToCantinho;
window.handleDarVolta = handleDarVolta;
window.showAdminView = showAdminView;
window.handleDeleteTag = handleDeleteTag;
window.changeUserRole = changeUserRole;
window.saveUserRole = saveUserRole;

// Expor variáveis globais para uso em outros módulos (atualização contínua)
window.currentProfile = currentProfile;
window.currentUser = currentUser;
window.getUserProfile = getUserProfile;
window.nextTagPage = nextTagPage;
window.prevTagPage = prevTagPage;
window.openUsersModal = openUsersModal;
window.closeUsersModal = closeUsersModal;
window.openTagsModal = openTagsModal;
window.closeTagsModal = closeTagsModal;

// Expor função globalmente

/**
 * Inicializa os elementos do header após ser injetado dinamicamente
 * Esta função é chamada pelo header.js após injetar o HTML do header
 */
let headerElementsInitialized = false;

export function initHeaderElements() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.error('header-container não encontrado!');
        return;
    }

    // Evitar duplicação de listeners
    if (headerElementsInitialized) {
        return;
    }
    headerElementsInitialized = true;

    // Toggle de tema
    const themeToggleMain = headerContainer.querySelector('#theme-toggle-main');
    if (themeToggleMain) {
        themeToggleMain.removeEventListener('click', toggleTheme);
        themeToggleMain.addEventListener('click', toggleTheme);
    }

    // Botão de notificações
    const btnNotifications = document.getElementById('btn-notifications');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsList = document.getElementById('notifications-list');
    const notificationsMarkRead = document.getElementById('notifications-mark-read');

    // Remover event listener anterior se existir
    if (btnNotifications && btnNotifications._notificationHandler) {
        btnNotifications.removeEventListener('click', btnNotifications._notificationHandler);
    }

    if (btnNotifications) {
        const notificationHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btnNotifications.classList.remove('ringing');
            const dropdown = document.getElementById('notifications-dropdown');
            if (dropdown) {
                if (dropdown.style.display === 'flex') {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('show');
                } else {
                    dropdown.style.display = 'flex';
                    dropdown.classList.add('show');
                    loadNotifications();
                }
            }
        };
        btnNotifications._notificationHandler = notificationHandler;
        btnNotifications.addEventListener('click', notificationHandler);
    }

    if (notificationsList) {
        notificationsList.addEventListener('click', (e) => {
            const item = e.target.closest('.notification-item');
            if (item) {
                e.preventDefault();
                const notificationId = item.dataset.notificationId;
                const assuntoId = item.dataset.assuntoId;
                const dropdown = document.getElementById('notifications-dropdown');
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
                markNotificationRead(notificationId).then(() => {
                    openNotificationTarget(assuntoId).then(() => {
                        loadNotifications();
                    });
                });
            }
        });
    }

    // Botão marcar todas como lidas
    if (notificationsMarkRead) {
        notificationsMarkRead.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdown = document.getElementById('notifications-dropdown');
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
            markAllNotificationsRead();
        });
    }

    // Fechar dropdown ao clicar fora (registrar apenas uma vez)
    if (!window.notificationsDropdownClickHandler) {
        window.notificationsDropdownClickHandler = (e) => {
            const dropdown = document.getElementById('notifications-dropdown');
            const btn = document.getElementById('btn-notifications');
            const overlay = document.getElementById('dropdown-overlay');
            if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
                if (overlay) {
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        if (!overlay.classList.contains('show')) {
                            overlay.style.display = 'none';
                        }
                    }, 300);
                }
            }
        };
        window.addEventListener('click', window.notificationsDropdownClickHandler);
    }

    // Fechar dropdown ao clicar no overlay
    const overlay = document.getElementById('dropdown-overlay');
    if (overlay && !overlay._clickHandler) {
        const overlayHandler = (e) => {
            const dropdown = document.getElementById('notifications-dropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
            }
            overlay.classList.remove('show');
            setTimeout(() => {
                if (!overlay.classList.contains('show')) {
                    overlay.style.display = 'none';
                }
            }, 300);
        };
        overlay._clickHandler = overlayHandler;
        overlay.addEventListener('click', overlayHandler);
    }

    // Botão Admin (só para admin e moderators)
    const btnAdmin = headerContainer.querySelector('#btn-admin');
    if (btnAdmin) {
        btnAdmin.addEventListener('click', () => {
            window.location.hash = '#/admin';
        });
        // Mostrar botão Admin se tiver acesso
        if (hasAdminAccess()) {
            btnAdmin.style.display = 'flex';
        }
    }

    // Botão Configurações
    const btnConfiguracoes = headerContainer.querySelector('#btn-configuracoes');
    if (btnConfiguracoes) {
        btnConfiguracoes.addEventListener('click', () => {
            window.location.hash = '#/settings';
        });
    }

    // Botão Ajuda
    const btnAjuda = headerContainer.querySelector('#btn-ajuda');
    if (btnAjuda) {
        btnAjuda.addEventListener('click', () => {
            window.location.hash = '#/page/como-usar';
        });
    }

    // Botão Logout
    const btnLogout = headerContainer.querySelector('#btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    // Mobile menu
    const mobileMenuBtn = headerContainer.querySelector('#mobile-menu-btn');
    const mobileMenuDropdown = headerContainer.querySelector('#mobile-menu-dropdown');
    const themeToggleMobile = headerContainer.querySelector('#theme-toggle-mobile');
    const btnAdminMobile = headerContainer.querySelector('#btn-admin-mobile');
    const btnAjudaMobile = headerContainer.querySelector('#btn-ajuda-mobile');
    const btnLogoutMobile = headerContainer.querySelector('#btn-logout-mobile');

    if (mobileMenuBtn && mobileMenuDropdown) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Debounce curto para ignorar cliques duplos/touch em sequência
            const now = Date.now();
            const last = mobileMenuBtn._lastToggle || 0;
            if (now - last < 300) {
                console.log('mobileMenuBtn ignored (debounce)');
                return;
            }
            mobileMenuBtn._lastToggle = now;
            console.log('mobileMenuBtn clicked', e.target);
            if (mobileMenuDropdown.classList.contains('show')) {
                mobileMenuDropdown.classList.remove('show');
                mobileMenuDropdown.style.display = 'none';
            } else {
                mobileMenuDropdown.classList.add('show');
                mobileMenuDropdown.style.display = 'flex';
            }
            console.log('mobileMenuDropdown.show?', mobileMenuDropdown.classList.contains('show'));
            try {
                const rect = mobileMenuDropdown.getBoundingClientRect();
                console.log('mobileMenuDropdown rect', rect);
            } catch (err) {
                console.warn('could not get rect for mobileMenuDropdown', err);
            }
            // Evitar que o clique que abriu o menu seja tratado pelo listener global
            // que fecha menus imediatamente (problema em alguns dispositivos móveis)
            try {
                mobileMenuDropdown.dataset.ignoreNextClick = '1';
                setTimeout(() => {
                    if (mobileMenuDropdown) delete mobileMenuDropdown.dataset.ignoreNextClick;
                }, 300);
            } catch (err) {
                // ignore
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            // Se acabamos de abrir o dropdown, ignorar o próximo clique externo (fix para mobile)
            if (mobileMenuDropdown.dataset && mobileMenuDropdown.dataset.ignoreNextClick === '1') {
                return;
            }
            if (!mobileMenuDropdown.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenuDropdown.classList.remove('show');
                mobileMenuDropdown.style.display = 'none';
            }
        });

        // Impedir que cliques dentro do dropdown fechem ele
        mobileMenuDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Toggle de tema mobile
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', toggleTheme);
    }

    // Botão Admin mobile
    if (btnAdminMobile) {
        btnAdminMobile.addEventListener('click', () => {
            window.location.hash = '#/admin';
        });
        // Mostrar botão Admin se tiver acesso
        if (hasAdminAccess()) {
            btnAdminMobile.style.display = 'flex';
            btnAdminMobile.classList.add('visible');
        }
    }

    // Botão Ajuda mobile
    if (btnAjudaMobile) {
        btnAjudaMobile.addEventListener('click', () => {
            window.location.hash = '#/page/como-usar';
        });
    }

    // Botão Logout mobile
    if (btnLogoutMobile) {
        btnLogoutMobile.addEventListener('click', handleLogout);
    }

    // Botão fechar modal de aviso do admin
    const adminAvisoClose = document.getElementById('admin-aviso-close');
    if (adminAvisoClose) {
        adminAvisoClose.addEventListener('click', closeAdminAvisoModal);
    }

    // Botão fechar modal ao clicar fora
    const adminAvisoModal = document.getElementById('admin-aviso-modal');
    if (adminAvisoModal) {
        adminAvisoModal.addEventListener('click', (e) => {
            if (e.target === adminAvisoModal) {
                closeAdminAvisoModal();
            }
        });
    }

    // Botão fechar anúncio completo
    const adminAnuncioClose = document.getElementById('admin-anuncio-close');
    if (adminAnuncioClose) {
        adminAnuncioClose.addEventListener('click', closeAdminAnuncioCompleto);
    }

    // Toggle de idioma nas configurações
    const langToggleSettings = document.getElementById('lang-toggle-settings');
    if (langToggleSettings) {
        langToggleSettings.addEventListener('click', toggleLanguage);
    }

    // Toggle de idioma no footer
    document.querySelectorAll('#lang-toggle-footer').forEach(btn => {
        btn.addEventListener('click', toggleLanguage);
    });

    // Inicializar estado dos botões de idioma
    initLanguageButtons();

    // Event listeners para modal de anúncios
    const adminCreateAnuncio = document.getElementById('admin-create-anuncio');
    if (adminCreateAnuncio) {
        adminCreateAnuncio.addEventListener('click', () => openAnuncioModal());
    }

    // Event listeners para modal de remessas de acesso
    const adminCreateBatch = document.getElementById('admin-create-batch');
    if (adminCreateBatch) {
        adminCreateBatch.addEventListener('click', openBatchModal);
    }

    const batchModalClose = document.getElementById('batch-modal-close');
    if (batchModalClose) {
        batchModalClose.addEventListener('click', closeBatchModal);
    }

    const batchCancel = document.getElementById('batch-cancel');
    if (batchCancel) {
        batchCancel.addEventListener('click', closeBatchModal);
    }

    const batchForm = document.getElementById('batch-form');
    if (batchForm) {
        batchForm.addEventListener('submit', handleBatchCreate);
    }

    // Carregar remessas quando a seção de acessos for mostrada
    document.querySelectorAll('[data-admin-section="access"]').forEach(btn => {
        btn.addEventListener('click', loadAccessBatches);
    });

    const anuncioModalClose = document.getElementById('anuncio-modal-close');
    if (anuncioModalClose) {
        anuncioModalClose.addEventListener('click', closeAnuncioModal);
    }

    const anuncioCancel = document.getElementById('anuncio-cancel');
    if (anuncioCancel) {
        anuncioCancel.addEventListener('click', closeAnuncioModal);
    }

    const anuncioForm = document.getElementById('anuncio-form');
    if (anuncioForm) {
        anuncioForm.addEventListener('submit', saveAnuncio);
    }

    // Fechar modal de anúncio ao clicar fora
    const anuncioModal = document.getElementById('anuncio-modal');
    if (anuncioModal) {
        anuncioModal.addEventListener('click', (e) => {
            if (e.target === anuncioModal) {
                closeAnuncioModal();
            }
        });
    }

    // Toolbar do editor de texto rico (apenas para feed, não para modal de páginas)
    const feedToolbarButtons = document.querySelectorAll('#feed-post-editor .editor-toolbar button[data-command]');
    feedToolbarButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const command = button.dataset.command;
            const value = button.dataset.value || null;

            if (command === 'formatBlock' && value) {
                document.execCommand(command, false, value);
            } else {
                document.execCommand(command, false, value);
            }
        });
    });

    // Botão de inserir imagem (PT)
    const insertImageBtn = document.getElementById('insert-image-btn');
    if (insertImageBtn) {
        insertImageBtn.addEventListener('click', () => {
            const imageUrl = prompt('URL da imagem:');
            if (imageUrl) {
                document.execCommand('insertImage', false, imageUrl);
            }
        });
    }

    // Botão de inserir imagem (EN)
    const insertImageBtnEn = document.getElementById('insert-image-btn-en');
    if (insertImageBtnEn) {
        insertImageBtnEn.addEventListener('click', () => {
            const imageUrl = prompt('URL da imagem:');
            if (imageUrl) {
                document.execCommand('insertImage', false, imageUrl);
            }
        });
    }

    // Botão de inserir link (PT)
    const insertLinkBtn = document.getElementById('insert-link-btn');
    if (insertLinkBtn) {
        insertLinkBtn.addEventListener('click', () => {
            const url = prompt('URL do link:');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        });
    }

    // Botão de inserir link (EN)
    const insertLinkBtnEn = document.getElementById('insert-link-btn-en');
    if (insertLinkBtnEn) {
        insertLinkBtnEn.addEventListener('click', () => {
            const url = prompt('URL do link:');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        });
    }

    // Modal de enquete
    const pollModal = document.getElementById('poll-modal');
    const pollModalClose = document.getElementById('poll-modal-close');
    const pollCancel = document.getElementById('poll-cancel');
    const pollForm = document.getElementById('poll-form');
    const addPollOption = document.getElementById('add-poll-option');
    const pollOptions = document.getElementById('poll-options');
    let currentEditor = null;

    // Botão de enquete (PT)
    const insertPollBtn = document.getElementById('insert-poll-btn');
    if (insertPollBtn) {
        insertPollBtn.addEventListener('click', () => {
            currentEditor = document.getElementById('anuncio-conteudo-pt');
            pollModal.classList.remove('hidden');
        });
    }

    // Botão de enquete (EN)
    const insertPollBtnEn = document.getElementById('insert-poll-btn-en');
    if (insertPollBtnEn) {
        insertPollBtnEn.addEventListener('click', () => {
            currentEditor = document.getElementById('anuncio-conteudo-en');
            pollModal.classList.remove('hidden');
        });
    }

    // Fechar modal de enquete
    if (pollModalClose) {
        pollModalClose.addEventListener('click', () => {
            pollModal.classList.add('hidden');
            pollForm.reset();
            resetPollOptions();
        });
    }

    if (pollCancel) {
        pollCancel.addEventListener('click', () => {
            pollModal.classList.add('hidden');
            pollForm.reset();
            resetPollOptions();
        });
    }

    // Fechar modal ao clicar fora
    if (pollModal) {
        pollModal.addEventListener('click', (e) => {
            if (e.target === pollModal) {
                pollModal.classList.add('hidden');
                pollForm.reset();
                resetPollOptions();
            }
        });
    }

    // Adicionar opção de enquete
    if (addPollOption) {
        addPollOption.addEventListener('click', () => {
            const optionCount = pollOptions.querySelectorAll('.poll-option').length;
            const newOption = document.createElement('div');
            newOption.className = 'poll-option';
            newOption.innerHTML = `
                <input type="text" class="poll-option-input" placeholder="Opção ${optionCount + 1}" required>
                <button type="button" class="remove-poll-option">✕</button>
            `;
            pollOptions.appendChild(newOption);

            // Adicionar event listener para remover
            newOption.querySelector('.remove-poll-option').addEventListener('click', () => {
                newOption.remove();
            });
        });
    }

    // Resetar opções de enquete
    function resetPollOptions() {
        pollOptions.innerHTML = `
            <div class="poll-option">
                <input type="text" class="poll-option-input" placeholder="Opção 1" required>
            </div>
            <div class="poll-option">
                <input type="text" class="poll-option-input" placeholder="Opção 2" required>
            </div>
        `;
    }

    // Salvar enquete
    if (pollForm) {
        pollForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const question = document.getElementById('poll-question').value;
            const optionInputs = pollOptions.querySelectorAll('.poll-option-input');
            const options = Array.from(optionInputs).map(input => input.value).filter(val => val.trim());

            if (options.length < 2) {
                alert('Mínimo de 2 opções é necessário.');
                return;
            }

            // Gerar HTML da enquete
            const pollId = 'poll-' + Date.now();
            let pollHtml = `
                <div class="poll-container" data-poll-id="${pollId}">
                    <div class="poll-question">${escapeHtml(question)}</div>
                    <div class="poll-options">
            `;

            options.forEach((option, index) => {
                pollHtml += `
                    <div class="poll-option-item">
                        <input type="radio" name="${pollId}" value="${index}">
                        <span class="poll-option-label">${escapeHtml(option)}</span>
                    </div>
                `;
            });

            pollHtml += `
                    </div>
                </div>
            `;

            // Inserir no editor
            if (currentEditor) {
                currentEditor.innerHTML += pollHtml;
            }

            pollModal.classList.add('hidden');
            pollForm.reset();
            resetPollOptions();
        });
    }

    // Função para atualizar estado ativo dos botões
    function updateHeaderActiveState() {
        const currentHash = window.location.hash;
        
        // Remover classe active de todos os botões
        if (btnAdmin) btnAdmin.classList.remove('active');
        if (btnConfiguracoes) btnConfiguracoes.classList.remove('active');
        
        // Adicionar classe active ao botão correspondente
        if (currentHash === '#/admin' && btnAdmin) {
            btnAdmin.classList.add('active');
        }
        if (currentHash === '#/settings' && btnConfiguracoes) {
            btnConfiguracoes.classList.add('active');
        }
    }

    // Atualizar estado inicial
    updateHeaderActiveState();

    // Atualizar estado quando hash mudar
    window.addEventListener('hashchange', updateHeaderActiveState);

    // Botão de busca
    const searchToggleBtn = headerContainer.querySelector('#search-toggle-btn');
    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', () => {
            const searchInputWrapper = headerContainer.querySelector('#search-input-wrapper');
            if (searchInputWrapper) {
                searchInputWrapper.classList.toggle('hidden');
                if (!searchInputWrapper.classList.contains('hidden')) {
                    headerContainer.querySelector('#search-input')?.focus();
                }
            }
        });
    }

    const searchCloseBtn = headerContainer.querySelector('#search-close-btn');
    if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', () => {
            const searchInputWrapper = headerContainer.querySelector('#search-input-wrapper');
            if (searchInputWrapper) searchInputWrapper.classList.add('hidden');
        });
    }

    // Navegação do header
    const navItemPracinha = headerContainer.querySelector('#nav-item-pracinha');
    if (navItemPracinha) {
        navItemPracinha.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/feed';
        });
    }
}

// Função para inicializar navegação mobile
function initMobileNavigation() {
    // Cantinho view navigation
    const cantinhoNavRight = document.getElementById('cantinho-nav-right');
    const cantinhoNavLeft = document.getElementById('cantinho-nav-left');
    const cantinhoView = document.getElementById('cantinho-view');

    if (cantinhoNavRight && cantinhoNavLeft && cantinhoView) {
        cantinhoNavRight.addEventListener('click', () => {
            cantinhoView.classList.add('show-posts');
            cantinhoNavRight.classList.add('hidden');
            cantinhoNavLeft.classList.remove('hidden');
        });

        cantinhoNavLeft.addEventListener('click', () => {
            cantinhoView.classList.remove('show-posts');
            cantinhoNavLeft.classList.add('hidden');
            cantinhoNavRight.classList.remove('hidden');
        });

        // Swipe detection for Cantinho view
        let touchStartX = 0;
        let touchEndX = 0;

        cantinhoView.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        cantinhoView.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe(cantinhoView, cantinhoNavRight, cantinhoNavLeft, touchStartX, touchEndX);
        }, { passive: true });
    }

    // Public profile view navigation
    const publicProfileNavRight = document.getElementById('public-profile-nav-right');
    const publicProfileNavLeft = document.getElementById('public-profile-nav-left');
    const publicProfileView = document.getElementById('public-profile-view');

    if (publicProfileNavRight && publicProfileNavLeft && publicProfileView) {
        publicProfileNavRight.addEventListener('click', () => {
            publicProfileView.classList.add('show-posts');
            publicProfileNavRight.classList.add('hidden');
            publicProfileNavLeft.classList.remove('hidden');
        });

        publicProfileNavLeft.addEventListener('click', () => {
            publicProfileView.classList.remove('show-posts');
            publicProfileNavLeft.classList.add('hidden');
            publicProfileNavRight.classList.remove('hidden');
        });

        // Swipe detection for Public Profile view
        let touchStartX = 0;
        let touchEndX = 0;

        publicProfileView.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        publicProfileView.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe(publicProfileView, publicProfileNavRight, publicProfileNavLeft, touchStartX, touchEndX);
        }, { passive: true });
    }
}

function handleSwipe(view, navRight, navLeft, startX, endX) {
    const swipeThreshold = 50; // Minimum distance to be considered a swipe
    const diff = startX - endX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - go to posts
            if (!view.classList.contains('show-posts')) {
                view.classList.add('show-posts');
                navRight.classList.add('hidden');
                navLeft.classList.remove('hidden');
            }
        } else {
            // Swipe right - go back to profile
            if (view.classList.contains('show-posts')) {
                view.classList.remove('show-posts');
                navLeft.classList.add('hidden');
                navRight.classList.remove('hidden');
            }
        }
    }
}

// Função para inicializar instalação PWA
function initPWAInstall() {
    let deferredPrompt;
    const installBar = document.getElementById('pwa-install-bar');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-install-close');

    // Verificar se já foi instalado
    if (localStorage.getItem('pwa-install-dismissed')) {
        return;
    }

    // Verificar se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }

    // Detectar evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('Evento beforeinstallprompt disparado');
        e.preventDefault();
        deferredPrompt = e;

        // Mostrar barra de instalação
        if (installBar) {
            // Definir textos diretamente
            const installText = installBar.querySelector('.pwa-install-text');
            const installBtnText = installBar.querySelector('.pwa-install-btn');
            if (installText) {
                installText.textContent = t('pwa.installText', currentLanguage);
            }
            if (installBtnText) {
                installBtnText.textContent = t('pwa.installBtn', currentLanguage);
            }
            installBar.classList.remove('hidden');
            console.log('Barra de instalação mostrada');
        }
    });

    // Botão de instalação
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            console.log('Botão de instalação clicado');
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                console.log('Resultado da instalação:', outcome);

                if (outcome === 'accepted') {
                    if (installBar) {
                        installBar.classList.add('hidden');
                    }
                }
            } else {
                console.log('Nenhum prompt de instalação disponível (normal em localhost)');
            }
        });
    }

    // Botão de fechar
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (installBar) {
                installBar.classList.add('hidden');
            }
            // Lembrar que usuário fechou
            localStorage.setItem('pwa-install-dismissed', 'true');
        });
    }

    // Esconder barra se já estiver instalado
    window.addEventListener('appinstalled', () => {
        if (installBar) {
            installBar.classList.add('hidden');
        }
    });
}

window.setupMBTISection = setupMBTISection;