// JavaScript Principal da Pracinha

import { translations, t } from './translations.js';
import { SUPABASE_CONFIG, isSupabaseConfigured } from './config.js';
import { openAvatarCropModal } from './avatar-crop.js';
import { initMusicPlayer, loadUserMusic, loadProfileMusic, initYouTubePlayer, hideYouTubePlayer } from './music-player.js';

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
    // Aplicar tema salvo
    applyTheme(currentTheme);

    // Tentar importar Supabase, mas continuar se falhar
    try {
        console.log('Tentando importar supabase-client...');
        const supabaseModule = await import('./supabase-client.js');
        console.log('Supabase module importado:', supabaseModule);
        
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

        console.log('Supabase carregado com sucesso, supabase:', supabase);
        console.log('updateUserProfile importado:', typeof updateUserProfile);
        console.log('updateUserProfile no módulo:', typeof supabaseModule.updateUserProfile);

        // Expor variáveis globais imediatamente após carregar Supabase
        window.updateUserProfile = updateUserProfile;
        console.log('updateUserProfile exposto globalmente:', typeof window.updateUserProfile);

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

                    // Mostrar botão Admin se tiver permissão
                    const adminBtn = document.getElementById('dropdown-admin');
                    if (adminBtn && hasAdminAccess()) {
                        adminBtn.style.display = 'block';
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

    if (pendingInviteToken) {
        showScreen('signup');
    }
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
    mainContent.classList.add('settings-mode');
    mainContent.style.padding = '';
    if (mainScreen) mainScreen.classList.add('settings-mode');

    // Restaurar background do usuário logado
    if (currentProfile) {
        applyBackground(currentProfile);
    }

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
    // Desabilitado temporariamente - forçar português
    // currentLanguage = currentLanguage === 'pt-BR' ? 'en' : 'pt-BR';
    // localStorage.setItem('pracinha-language', currentLanguage);
    // updateLanguageUI();
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

    // Atualizar atributo lang do HTML
    document.documentElement.lang = currentLanguage;

    const scrollTopBtn = document.getElementById('btn-scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.setAttribute('aria-label', t('btn.scrollTop', currentLanguage));
        scrollTopBtn.title = t('btn.scrollTop', currentLanguage);
    }
}

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
function setupEventListeners() {
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

    const btnRequestAccess = document.getElementById('btn-request-access');
    if (btnRequestAccess) btnRequestAccess.addEventListener('click', openBetaAccessModal);

    // Navegação entre login e signup
    const loginRequestAccess = document.getElementById('login-request-access');
    if (loginRequestAccess) {
        loginRequestAccess.addEventListener('click', (e) => {
            e.preventDefault();
            openBetaAccessModal();
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

    // Formulário de conta
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', handleProfileUpdate);
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
                        alert('Insira pelo menos duas opções para a enquete.');
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
            window.location.hash = '/feed';
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
            const assuntoText = document.getElementById('assunto-text');
            if (assuntoText) {
                assuntoText.focus();
            }
        });
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

    const btnNotifications = document.getElementById('btn-notifications');
    if (btnNotifications) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationsDropdown();
        });
    }

    const markAllRead = document.getElementById('notifications-mark-read');
    if (markAllRead) {
        markAllRead.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllNotificationsRead();
        });
    }

    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        notificationsList.addEventListener('click', handleNotificationListClick);
    }

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', closeDropdownOnClickOutside);

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
                alert('Por favor, selecione uma imagem (JPG, PNG, WebP, GIF).');
                avatarUploadSettingsInput.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('A imagem é muito grande. Escolha um arquivo de até 10 MB.');
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
                alert('Erro ao fazer upload da foto. Tente novamente.');
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
                alert('Faça login para adicionar uma imagem.');
                return;
            }
            assuntoImagemUpload.click();
        });

        assuntoImagemUpload.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione uma imagem (JPG, PNG, WebP, GIF).');
                e.target.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('A imagem é muito grande. Escolha um arquivo de até 10 MB.');
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
                alert('Erro ao processar imagem. Tente novamente.');
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
                btnPostar.textContent = 'Salvar';
            }

            editingAssuntoId = avisoId;
            assuntoText?.focus();
        }, 200);
    } catch (err) {
        console.error('Erro ao carregar assunto para edição:', err);
        alert('Erro ao abrir editor: ' + (err.message || err));
    }
}

// Handle login
async function handleLogin() {
    if (!isSupabaseConfigured()) {
        alert('Supabase não está configurado. Por favor, configure as credenciais em src/js/config.js');
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

        showScreen('main');
        showFeedView();
        loadFeed();
        initNotifications();
        initOnlineVisitorsTracking();
    } catch (error) {
        console.error('Erro no login:', error.message);
        alert('Erro ao fazer login: ' + error.message);
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

async function handleBetaAccessRequest(event) {
    event.preventDefault();

    if (!requestBetaAccess) {
        alert('O serviço de pedidos de acesso não está disponível agora.');
        return;
    }

    const form = document.getElementById('beta-access-form');
    const emailInput = document.getElementById('beta-access-email');
    const messageInput = document.getElementById('beta-access-message');
    const submitButton = form?.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || '';

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
    }

    try {
        await requestBetaAccess(emailInput?.value || '', messageInput?.value || '');
        if (form) {
            form.reset();
        }
        closeBetaAccessModal();
        alert('Pedido enviado. Se aprovado, você receberá um convite por e-mail.');
    } catch (error) {
        console.error('Erro ao pedir acesso:', error);
        alert('Não foi possível enviar o pedido. Tente novamente.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
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
        alert('Supabase não está configurado. Por favor, configure as credenciais em src/js/config.js');
        return;
    }

    if (!pendingInviteToken) {
        alert('O cadastro só pode ser feito através de um convite válido.');
        showScreen('landing');
        return;
    }

    const apelido = document.getElementById('signup-apelido').value;
    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const terms = document.getElementById('signup-terms').checked;

    console.log('Dados do formulário:', { apelido, name, username, email, terms });

    if (!validateUsername(username)) {
        alert('Username deve começar com @ e ter pelo menos 3 caracteres (ex: @joao)');
        return;
    }

    console.log('Verificando se username existe...');
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
        alert('Este username já está em uso. Escolha outro.');
        return;
    }

    if (password !== confirmPassword) {
        alert('As senhas não coincidem');
        return;
    }

    if (!terms) {
        alert('Você precisa aceitar os termos de uso');
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
                    idioma: currentLanguage,
                    invite_token: pendingInviteToken
                }
            }
        });

        console.log('Resultado do signup:', { data, error });

        if (error) throw error;

        alert('Conta criada com sucesso! Verifique seu email para confirmar o cadastro. O email de confirmação será enviado pelo remetente "Supabase Auth".');
        pendingInviteToken = '';
        window.history.replaceState({}, document.title, window.location.pathname);
        showScreen('login');
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        alert('Erro ao criar conta: ' + error.message);
    }
}

// Handle "Dar uma volta"
async function handleDarVolta() {
    if (!currentUser) {
        alert('Faça login para descobrir alguém.');
        return;
    }

    if (!getAllProfiles) {
        alert('Erro: função não disponível.');
        return;
    }

    try {
        const profiles = await getAllProfiles();
        
        // Filtrar para excluir o próprio usuário
        const otherProfiles = profiles.filter(p => p.id !== currentUser.id);
        
        if (otherProfiles.length === 0) {
            alert('Não há outros usuários para descobrir no momento.');
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
            alert('Perfil selecionado não tem username.');
        }
        
    } catch (error) {
        console.error('Erro ao descobrir alguém:', error);
        alert('Erro ao descobrir alguém: ' + error.message);
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
        alert('Supabase não está configurado.');
        return;
    }

    if (!currentUser) {
        alert('Você precisa estar logado para postar.');
        return;
    }

    const texto = document.getElementById('assunto-text').value.trim();
    const tag = document.getElementById('assunto-tag').value;
    const avisoAdmin = document.getElementById('assunto-aviso-admin')?.checked || false;

    if (!texto) {
        alert('Digite algo para postar.');
        return;
    }

    const btnPostar = document.getElementById('btn-postar-assunto');
    const originalText = btnPostar ? btnPostar.textContent : '';
    if (btnPostar) {
        btnPostar.disabled = true;
        btnPostar.textContent = 'Enviando...';
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
        selectedAssuntoImageFile = null;
        const previewContainer = document.getElementById('composer-image-preview');
        const previewImg = document.getElementById('composer-preview-img');
        if (previewContainer) previewContainer.classList.add('hidden');
        if (previewImg) previewImg.src = '';
        const fileInput = document.getElementById('assunto-imagem-upload');
        if (fileInput) fileInput.value = '';

        // Limpar checkbox de aviso admin
        const avisoAdminCheckbox = document.getElementById('assunto-aviso-admin');
        if (avisoAdminCheckbox) avisoAdminCheckbox.checked = false;

        // Recarregar feed
        loadFeed();

    } catch (error) {
        console.error('Erro ao postar assunto:', error.message);
        alert('Erro ao postar assunto: ' + error.message);
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
        const h1 = div.querySelector('h1');
        if (h1) {
            return h1.textContent.trim() || 'Sem título';
        }
        return (div.textContent || div.innerText || '').trim() || 'Sem título';
    };

    adminAvisos.innerHTML = avisos.map(aviso => `
        <div class="admin-aviso-card" data-aviso-id="${aviso.id}">
            <div class="admin-aviso-icon">📢</div>
            <div class="admin-aviso-title">${escapeHtml(getAdminAvisoTitle(aviso[titleField]))}</div>
            ${hasAdminAccess() ? `<button type="button" class="admin-aviso-edit-btn" data-aviso-id="${aviso.id}" title="Editar aviso">✏️</button>` : ''}
        </div>
    `).join('');

    adminAvisos.classList.remove('hidden');

    // Adicionar event listeners para abrir o aviso
    adminAvisos.querySelectorAll('.admin-aviso-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Não navegar se clicou no botão de editar
            if (e.target.closest('.admin-aviso-edit-btn')) return;
            const avisoId = card.dataset.avisoId;
            // Navegar para a URL do post
            window.location.hash = `/post/${avisoId}`;
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

async function loadFeed() {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Carregar avisos do administrador
    await loadAdminAvisos();

    const hasPosts = feedContent.querySelector('.assunto-card');
    const scrollY = window.scrollY;

    if (!hasPosts) {
        feedContent.innerHTML = '<p class="feed-loading">Carregando...</p>';
    } else {
        feedContent.classList.add('is-updating');
    }

    if (!supabase) {
        feedContent.classList.remove('is-updating');
        feedContent.innerHTML = '<p class="feed-error">Supabase não está configurado. Configure as credenciais em src/js/config.js para ver o feed.</p>';
        return;
    }

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
            feedContent.innerHTML = '<p class="feed-error">Erro ao carregar feed. Tente novamente mais tarde.</p>';
            return;
        }

        if (!data || data.length === 0) {
            feedContent.classList.remove('is-updating');
            feedContent.innerHTML = '<p class="feed-empty">Nenhum assunto encontrado. Seja o primeiro a postar!</p>';
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
        feedContent.innerHTML = '<p class="feed-error">Erro ao carregar feed. Tente novamente mais tarde.</p>';
    }
}

async function loadFeedWithPost(postId) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Carregar avisos do administrador
    await loadAdminAvisos();

    feedContent.innerHTML = '<p class="feed-loading">Carregando...</p>';

    if (!supabase) {
        feedContent.innerHTML = '<p class="feed-error">Supabase não está configurado. Configure as credenciais em src/js/config.js para ver o feed.</p>';
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
            feedContent.innerHTML = '<p class="feed-error">Post não encontrado.</p>';
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
        feedContent.innerHTML = '<p class="feed-error">Erro ao carregar feed. Tente novamente mais tarde.</p>';
    }
            }

            async function loadFeedWithStatus(statusId) {
    const feedContent = document.getElementById('feed-content');
    if (!feedContent) return;

    // Carregar avisos do administrador
    await loadAdminAvisos();

    feedContent.innerHTML = '<p class="feed-loading">Carregando...</p>';

    if (!supabase) {
        feedContent.innerHTML = '<p class="feed-error">Supabase não está configurado. Configure as credenciais em src/js/config.js para ver o feed.</p>';
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
        feedContent.innerHTML = '<p class="feed-error">Erro ao carregar feed. Tente novamente mais tarde.</p>';
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
            <span class="poll-votes">${counts[index]} voto${counts[index] === 1 ? '' : 's'}</span>
        </li>
    `).join('')}
            </ul>
            <div class="poll-votes">Total: ${totalVotes} voto${totalVotes === 1 ? '' : 's'}</div>
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
        alert('Erro ao votar na enquete: ' + (err.message || 'tente novamente.'));
    } finally {
        button.disabled = false;
    }
            }

            async function fetchProfileByUsername(username) {
    if (!supabase || !username) return null;

    const key = username.startsWith('@') ? username : `@${username}`;
    if (profileCache.has(key)) return profileCache.get(key);

    const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, username, fotos, recado, pais, bio')
        .eq('username', key)
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
    return t('replies.many', currentLanguage).replace('{n}', count);
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
    const autorNome = autor?.apelido || autor?.nome || assunto.autor_nome || 'Visitante';
    const autorUsername = autor?.username || assunto.autor_username || '';
    const autorFoto = autor?.fotos?.[0] || assunto.autor_foto || '';
    const texto = assunto.texto_pt || assunto.texto || '';
    const replyCount = assunto.respostas?.length || 0;
    let autorId = null;

    if (autor?.id) {
        autorId = String(autor.id);
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
        <p class="assunto-text">${(function () { const ytMatch = texto.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^?&]+)/); if (ytMatch) { const videoId = ytMatch[1]; return '<div class="assunto-video-wrapper"><iframe src="https://www.youtube.com/embed/' + videoId + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'; } return assunto.aviso_admin ? processAdminHtml(texto) : formatTextWithMentions(texto); })()}</p>
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
        feedContent.innerHTML = '<p class="feed-empty">Nenhum assunto encontrado</p>';
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
        feedContent.innerHTML = '<p class="feed-empty">Nenhum assunto encontrado</p>';
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
        alert('Supabase não está configurado.');
        return;
    }

    if (!currentUser) {
        alert('Faça login para reagir.');
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
        alert('Supabase não está configurado.');
        return;
    }

    if (!currentUser) {
        alert('Faça login para responder.');
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
                alert('Erro ao fixar assunto: ' + result.error.message);
            }
        }
    } catch (error) {
        console.error('Erro ao processar ação de fixar:', error);
        alert('Erro ao processar ação de fixar: ' + error.message);
    }
            }

            async function deleteStatusFromFeed(statusId) {
    if (!supabase || !currentUser) return;
    if (!confirm('Deseja realmente apagar este status?')) return;
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
        container.innerHTML = '<p class="reply-empty">Erro ao carregar respostas.</p>';
    }
            }

            async function submitStatusComment(statusId, content) {
    if (!currentUser) {
        alert('Faça login para responder.');
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
    document.getElementById('profile-genero').value = currentProfile.genero || '';
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

    const showGenero = document.getElementById('show-genero');
    if (showGenero) showGenero.checked = currentProfile.show_genero !== false;

    const showSexualidade = document.getElementById('show-sexualidade');
    if (showSexualidade) showSexualidade.checked = currentProfile.show_sexualidade !== false;

    const showMbti = document.getElementById('show-mbti');
    if (showMbti) showMbti.checked = currentProfile.show_mbti !== false;

    const showSite = document.getElementById('show-site');
    if (showSite) showSite.checked = currentProfile.show_site !== false;

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
        // Buscar perfil pelo username
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error) throw error;
        if (!profile) {
            alert('Perfil não encontrado');
            showFeedView();
            return;
        }

        // Atualizar UI do perfil público
        const profileApelido = document.getElementById('public-profile-apelido');
        if (profileApelido) profileApelido.textContent = profile.apelido || profile.nome || 'Usuário';

        const profileName = document.getElementById('public-profile-name');
        if (profileName) {
            if (profile.show_name !== false && profile.nome) {
                profileName.textContent = profile.nome;
                profileName.classList.remove('hidden');
            } else {
                profileName.classList.add('hidden');
            }
        }

        const profileUsername = document.getElementById('public-profile-username');
        if (profileUsername) profileUsername.textContent = profile.username || '@usuario';

        const profileBio = document.getElementById('public-profile-bio');
        if (profileBio) profileBio.textContent = profile.bio ? `"${profile.bio}"` : '"Sem bio"';

        const profileLocation = document.getElementById('public-profile-location');
        if (profileLocation) {
            const locText = profileLocation.querySelector('.loc-text');
            if (locText) locText.textContent = profile.local || profile.pais || 'Local não informado';
        }

        const profileAge = document.getElementById('public-profile-age');
        if (profileAge) {
            if (profile.data_nascimento) {
                const idade = calculateAge(profile.data_nascimento);
                profileAge.textContent = ` ${idade} anos`;
            } else {
                profileAge.style.display = 'none';
            }
        }

        const profileGender = document.getElementById('public-profile-gender');
        if (profileGender) {
            profileGender.textContent = profile.genero || '';
            profileGender.style.display = profile.genero ? 'block' : 'none';
        }

        const profileSexuality = document.getElementById('public-profile-sexuality');
        if (profileSexuality) {
            profileSexuality.textContent = profile.sexualidade || '';
            profileSexuality.style.display = profile.sexualidade ? 'block' : 'none';
        }

        const profileMbti = document.getElementById('public-profile-mbti');
        if (profileMbti) {
            profileMbti.textContent = profile.mbti || '';
            profileMbti.style.display = (profile.show_mbti !== false && profile.mbti) ? 'block' : 'none';
        }

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

    } catch (error) {
        console.error('Erro ao carregar perfil público:', error);
        alert('Erro ao carregar perfil');
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
    const rightAvatarImg = document.getElementById('right-profile-avatar');
    const headerUsername = document.getElementById('header-username-text');
    const rightApelido = document.getElementById('right-profile-apelido');
    const rightName = document.getElementById('right-profile-name');
    const rightLocation = document.getElementById('right-profile-location');
    const rightMusic = document.getElementById('right-profile-music');
    const rightRecado = document.getElementById('right-profile-recado');
    const photosGrid = document.getElementById('right-profile-photos-grid');
    const footerCreatorNames = document.querySelectorAll('.footer-creator-name');

    let avatarUrl = '';

    if (currentProfile && currentProfile.fotos && currentProfile.fotos.length > 0) {
        avatarUrl = currentProfile.fotos[0];
    } else {
        // Avatar padrão com iniciais
        const initials = currentProfile?.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || currentProfile?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
        avatarUrl = `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect width="40" height="40" fill="#D4C4A8"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="#4A7C59" font-family="Arial">${initials}</text>
            </svg>
        `)}`;
    }

    if (avatarImg) avatarImg.src = avatarUrl;
    if (rightAvatarImg) rightAvatarImg.src = avatarUrl;

    if (currentProfile) {
        if (headerUsername) headerUsername.textContent = currentProfile.apelido || currentProfile.nome || 'Visitante';
        if (rightApelido) rightApelido.textContent = currentProfile.apelido || currentProfile.nome || 'Visitante';
        
        // Carregar nome pequeno com opção de mostrar
        if (rightName) {
            if (currentProfile.show_name !== false && currentProfile.nome) {
                rightName.textContent = currentProfile.nome;
                rightName.classList.remove('hidden');
            } else {
                rightName.classList.add('hidden');
            }
        }
        
        if (rightLocation) {
            const locText = rightLocation.querySelector('.loc-text');
            if (locText) {
                locText.textContent = currentProfile.local || currentProfile.pais || 'De algum lugar';
            }
        }
        if (rightMusic) rightMusic.textContent = currentProfile.musica || 'Nenhuma';
        if (rightRecado) rightRecado.textContent = currentProfile.recado || 'fazendo um café';

        // Carregar assuntos fixados na sidebar
        if (currentProfile.id) {
            loadPinnedAssuntos(currentProfile.id);
        }

        // Carregar fotos do usuário na sidebar direita
        if (currentProfile.id) {
            loadUserPhotos(currentProfile.id);
        }

        // Aplicar background do usuário logado
        applyBackground(currentProfile);

        // Carregar novos campos
        const rightUsernameEl = document.getElementById('right-profile-username');
        if (rightUsernameEl) {
            rightUsernameEl.textContent = currentProfile.username ? currentProfile.username : '@usuario';
        }

        const rightBio = document.getElementById('right-profile-bio');
        if (rightBio) {
            rightBio.textContent = currentProfile.bio ? `"${currentProfile.bio}"` : '"Uma bio curtamente incrível."';
            rightBio.style.display = currentProfile.show_bio !== false ? 'block' : 'none';
        }

        const rightAge = document.getElementById('right-profile-age');
        if (rightAge) {
            if (currentProfile.data_nascimento) {
                const idade = calculateAge(currentProfile.data_nascimento);
                rightAge.textContent = ` ${idade} anos`;
            } else {
                rightAge.textContent = 'Idade';
            }
            rightAge.style.display = currentProfile.show_idade !== false ? 'block' : 'none';
        }

        const rightGender = document.getElementById('right-profile-gender');
        if (rightGender) {
            rightGender.textContent = currentProfile.genero ? ` ${currentProfile.genero}` : 'Gênero';
            rightGender.style.display = currentProfile.show_genero !== false ? 'block' : 'none';
        }

        const rightSexuality = document.getElementById('right-profile-sexuality');
        if (rightSexuality) {
            rightSexuality.textContent = currentProfile.sexualidade ? ` ${currentProfile.sexualidade}` : 'Sexualidade';
            rightSexuality.style.display = currentProfile.show_sexualidade !== false ? 'block' : 'none';
        }

        const rightMbti = document.getElementById('right-profile-mbti');
        if (rightMbti) {
            if (currentProfile.show_mbti !== false && currentProfile.mbti) {
                rightMbti.textContent = ` ${currentProfile.mbti}`;
                rightMbti.style.display = 'block';
            } else {
                rightMbti.style.display = 'none';
            }
        }

        const rightSite = document.getElementById('right-profile-site');
        if (rightSite) {
            if (currentProfile.site_url) {
                rightSite.href = currentProfile.site_url;
                rightSite.target = '_blank';
                rightSite.rel = 'noopener';
                rightSite.title = currentProfile.site_url;
            } else {
                rightSite.href = '#';
            }
            rightSite.style.display = currentProfile.show_site !== false ? 'block' : 'none';
        }

        if (rightLocation) {
            const locText = rightLocation.querySelector('.loc-text');
            if (locText) {
                locText.textContent = currentProfile.local || currentProfile.pais || 'Cidade - Estado, País';
            }
            rightLocation.style.display = currentProfile.show_local !== false ? 'block' : 'none';
        }

        footerCreatorNames.forEach(el => {
            el.textContent = currentProfile.nome || 'Visitante';
        });

        // Renderizar fotos
        if (photosGrid) {
            const photos = currentProfile.fotos || [];
            let photosHtml = '';
            for (let i = 0; i < 6; i++) {
                if (i < photos.length) {
                    photosHtml += `<div class="grid-photo-item"><img src="${photos[i]}" alt="Foto ${i + 1}"></div>`;
                } else {
                    photosHtml += `<div class="grid-photo-placeholder"></div>`;
                }
            }
            photosGrid.innerHTML = photosHtml;
        }
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

            // Handle atualização de perfil
            async function handleProfileUpdate(e) {
    e.preventDefault();

    if (!supabase) {
        alert('Supabase não está configurado.');
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
            alert('Username deve começar com @ e ter pelo menos 3 caracteres (ex: @joao)');
            return;
        }

        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            alert('Este username já está em uso. Escolha outro.');
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
            username: username
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

        const genero = document.getElementById('profile-genero');
        if (genero) profileData.genero = genero.value;

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

        const showGenero = document.getElementById('show-genero');
        if (showGenero) profileData.show_genero = showGenero.checked;

        const showSexualidade = document.getElementById('show-sexualidade');
        if (showSexualidade) profileData.show_sexualidade = showSexualidade.checked;

        const showMbti = document.getElementById('show-mbti');
        if (showMbti) profileData.show_mbti = showMbti.checked;

        const showSite = document.getElementById('show-site');
        if (showSite) profileData.show_site = showSite.checked;

        const showName = document.getElementById('show-name');
        if (showName) profileData.show_name = showName.checked;

        // Validar mínimo de 4 campos ativos
        const activeFields = [
            showBio?.checked,
            showLocal?.checked,
            showIdade?.checked,
            showGenero?.checked,
            showSexualidade?.checked,
            showMbti?.checked,
            showSite?.checked
        ].filter(Boolean).length;

        if (activeFields < 4) {
            alert('Você precisa ter pelo menos 4 campos visíveis no widget.');
            return;
        }

        // Processar personalização de background
        const bgTypeRadio = document.querySelector('input[name="bg-type"]:checked');
        if (bgTypeRadio) {
            const bgType = bgTypeRadio.value;

            if (bgType === 'none') {
                profileData.bg_type = null;
                profileData.bg_color = null;
                profileData.bg_image = null;
            } else if (bgType === 'color') {
                const bgColor = document.getElementById('bg-color');
                if (bgColor) {
                    profileData.bg_type = 'color';
                    profileData.bg_color = bgColor.value;
                    profileData.bg_image = null;
                }
            } else if (bgType === 'image') {
                const bgPresetGrid = document.getElementById('bg-preset-grid');
                const selectedPreset = bgPresetGrid?.querySelector('.bg-preset-item.selected');

                if (selectedPreset) {
                    // Usar imagem pré-definida
                    const presetPath = selectedPreset.dataset.preset;
                    profileData.bg_type = 'image';
                    profileData.bg_color = null;
                    profileData.bg_image = presetPath;
                } else {
                    const bgImageUpload = document.getElementById('bg-image-upload');
                    if (bgImageUpload && bgImageUpload.files[0]) {
                        // Comprimir e redimensionar imagem antes do upload
                        const file = bgImageUpload.files[0];
                        const compressedBlob = await compressImage(file, 1920, 1080, 0.7);

                        const filePath = `${currentUser.id}/bg-${Date.now()}.webp`;

                        const { error: uploadError } = await supabase.storage
                            .from('fotos')
                            .upload(filePath, compressedBlob);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('fotos')
                            .getPublicUrl(filePath);

                        profileData.bg_type = 'image';
                        profileData.bg_color = null;
                        profileData.bg_image = publicUrl;
                    } else if (currentProfile.bg_image) {
                        // Manter imagem existente se não houver nova
                        profileData.bg_type = 'image';
                        profileData.bg_color = null;
                    }
                }
            }
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', currentUser.id);

        if (profileError) throw profileError;

        // Recarregar dados do perfil
        currentProfile = await getUserProfile(currentUser.id);
        loadUserAvatar();

        // Recarregar player de música se tiver SoundCloud
        if (currentProfile.soundcloud_url) {
            await loadProfileMusic(currentProfile, 'music-player-card');
        }

        alert('Perfil atualizado com sucesso!');
        document.getElementById('profile-new-password').value = '';

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error.message);
        alert('Erro ao atualizar perfil: ' + error.message);
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
            const isGenderField = fieldName === 'genero';
            const isSexualityField = fieldName === 'sexualidade';

            // Substituir elemento por input/select
            this.classList.add('editing');
            this.innerHTML = '';

            if (isGenderField) {
                // Criar select para gênero
                const select = document.createElement('select');
                select.className = 'inline-edit-input';

                const options = [
                    { value: '', text: 'Selecione...' },
                    { value: 'Homem Cis', text: 'Homem Cis' },
                    { value: 'Mulher Cis', text: 'Mulher Cis' },
                    { value: 'Homem Trans', text: 'Homem Trans' },
                    { value: 'Mulher Trans', text: 'Mulher Trans' },
                    { value: 'Não-Binário', text: 'Não-Binário' },
                    { value: 'Outro', text: 'Outro' }
                ];

                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    if (currentProfile && currentProfile.genero === opt.value) {
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
            'genero': 'genero',
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
        return t('notif.reply', currentLanguage).replace('{name}', nome);
    }

    if (notification.tipo === 'mencao') {
        return t('notif.mention', currentLanguage).replace('{name}', nome);
    }

    return t('notif.reaction', currentLanguage)
        .replace('{name}', nome)
        .replace('{emoji}', notification.emoji || '');
            }

            function updateNotificationBadge(unreadCount) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
            }

            function renderNotificationsList(notifications) {
    const list = document.getElementById('notifications-list');
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
    if (dropdown) dropdown.classList.remove('show');
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
    closeNotificationsDropdown();
    await openNotificationTarget(assuntoId);
    await loadNotifications();
            }

            // Toggle dropdown do avatar
            function toggleAvatarDropdown() {
    const dropdown = document.getElementById('avatar-dropdown');
    closeNotificationsDropdown();
    dropdown.classList.toggle('show');
            }

            // Fechar dropdown ao clicar fora
            function closeDropdownOnClickOutside(e) {
    const dropdown = document.getElementById('avatar-dropdown');
    const avatar = document.getElementById('header-avatar');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsBtn = document.getElementById('btn-notifications');

    if (dropdown && avatar && !dropdown.contains(e.target) && !avatar.contains(e.target)) {
        dropdown.classList.remove('show');
    }

    if (
        notificationsDropdown &&
        notificationsBtn &&
        !notificationsDropdown.contains(e.target) &&
        !notificationsBtn.contains(e.target)
    ) {
        notificationsDropdown.classList.remove('show');
    }
            }

            // Handle logout
            async function handleLogout() {
    if (!supabase) {
        alert('Supabase não está configurado.');
        return;
    }

    await supabase.auth.signOut();
    window.location.reload();
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
    if (mainScreen) mainScreen.classList.remove('settings-mode');
    mainContent.classList.remove('settings-mode');
    mainContent.style.padding = '';
    updateScrollTopVisibility();

    // Carregar visitantes online e assuntos de hoje para o Cantinho
    loadOnlineVisitorsForCantinho();
    loadTrendingTopicsForCantinho();
            }

            function goToMyCantinho() {
    const cantinhoTitle = document.getElementById('cantinho-title');

    // Atualizar URL para o próprio cantinho
    window.location.hash = '#/cantinho';

    // Mostrar o próprio perfil (Meu Cantinho)
    if (cantinhoTitle) {
        cantinhoTitle.textContent = 'Meu Cantinho';
    }
    showCantinhoView();
    loadCantinhoData(currentProfile).catch(err => console.error('Erro ao carregar cantinho:', err));

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

    console.log('goToProfile chamado com username:', username);

    // Se temos username e é diferente do próprio, tentamos carregar o perfil desse usuário
    if (username && username !== currentProfile?.username) {
        // Remover @ duplicado se existir
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
        
        try {
            const { getUserProfileByUsername } = await import('./supabase-client.js');
            const otherProfile = await getUserProfileByUsername(cleanUsername);

            console.log('Perfil carregado:', otherProfile);

            if (otherProfile) {
                // Atualizar URL para o perfil do usuário
                window.location.hash = `/@${cleanUsername}`;
                // Atualizar título do cantinho para mostrar que é de outro usuário
                if (cantinhoTitle) {
                    cantinhoTitle.textContent = `Cantinho de @${cleanUsername}`;
                }
                // Mostrar botão com apelido do dono do cantinho (usar apelido ou username como fallback)
                if (navItemCantinhoDono && cantinhoDonoLabel) {
                    const displayName = otherProfile.apelido || otherProfile.username || cleanUsername;
                    console.log('Mostrando botão de apelido:', displayName, otherProfile);
                    navItemCantinhoDono.classList.remove('hidden');
                    cantinhoDonoLabel.textContent = displayName;
                }
                showCantinhoView();
                await loadCantinhoData(otherProfile);
                await loadProfileMusic(otherProfile, 'cantinho-music-player-card');
            } else {
                // Se não encontrar, mostra o próprio perfil
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
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            // Se der erro, mostra o próprio perfil
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
        }
    } else {
        // Se não tem username ou é o próprio perfil, mostra o próprio cantinho
        if (cantinhoTitle) {
            cantinhoTitle.textContent = 'Meu Cantinho';
        }
        // Esconder botão de apelido
        if (navItemCantinhoDono) {
            navItemCantinhoDono.classList.add('hidden');
        }
        showCantinhoView();
        await loadCantinhoData(currentProfile);
        await loadProfileMusic(currentProfile, 'cantinho-music-player-card');
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
                cantinhoTitle.textContent = 'Meu Cantinho';
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
        console.error('loadCantinhoData: profile is null');
        return;
    }

    // Aplicar background do dono do cantinho
    applyBackground(profile);

    // Elementos do Cantinho
    const cantinhoAvatar = document.getElementById('cantinho-avatar');
    const cantinhoApelido = document.getElementById('cantinho-apelido');
    const cantinhoName = document.getElementById('cantinho-name');
    const cantinhoUsername = document.getElementById('cantinho-username');
    const cantinhoPais = document.getElementById('cantinho-pais');
    const cantinhoBio = document.getElementById('cantinho-bio');
    const cantinhoMusic = document.getElementById('cantinho-musica');
    const cantinhoRecado = document.getElementById('cantinho-recado');
    const cantinhoPhotosGrid = document.getElementById('cantinho-photos-grid');
    const cantinhoPhotosCount = document.getElementById('cantinho-photos-count');
    const cantinhoFeedContent = document.getElementById('cantinho-feed-content');

    // Novos elementos de campos configuráveis
    const cantinhoAge = document.getElementById('cantinho-age');
    const cantinhoGender = document.getElementById('cantinho-gender');
    const cantinhoSexuality = document.getElementById('cantinho-sexuality');
    const cantinhoMbti = document.getElementById('cantinho-mbti');
    const cantinhoSite = document.getElementById('cantinho-site');

    if (cantinhoAvatar && profile.fotos?.[0]) {
        cantinhoAvatar.src = profile.fotos[0];
    }
    if (cantinhoApelido) {
        const roleBadge = await getRoleBadge(profile.id);
        cantinhoApelido.innerHTML = `${escapeHtml(profile.apelido || profile.nome || 'Visitante')}${roleBadge}`;
    }
    if (cantinhoName) {
        if (profile.show_name !== false && profile.nome) {
            cantinhoName.textContent = profile.nome;
            cantinhoName.classList.remove('hidden');
        } else {
            cantinhoName.classList.add('hidden');
        }
    }
    if (cantinhoUsername) cantinhoUsername.textContent = profile.username || '';
    if (cantinhoBio) cantinhoBio.textContent = profile.bio || '';
    if (cantinhoMusic) cantinhoMusic.textContent = profile.musica || '';
    if (cantinhoRecado) cantinhoRecado.textContent = profile.recado || '';

    // Carregar player de música se tiver SoundCloud
    if (profile.soundcloud_url) {
        await loadProfileMusic(profile);
    }

    // Esconder todos os campos configuráveis por padrão
    if (cantinhoAge) cantinhoAge.classList.add('hidden');
    if (cantinhoGender) cantinhoGender.classList.add('hidden');
    if (cantinhoSexuality) cantinhoSexuality.classList.add('hidden');
    if (cantinhoMbti) cantinhoMbti.classList.add('hidden');
    if (cantinhoSite) cantinhoSite.classList.add('hidden');
    if (cantinhoPais) cantinhoPais.classList.add('hidden');

    // Carregar campos configuráveis baseados nas flags de visibilidade
    const isOwner = Boolean(currentUser && currentUser.id === profile.id);

    // Habilitar edição se for o próprio cantinho
    if (isOwner) {
        if (cantinhoName) {
            cantinhoName.contentEditable = 'true';
            cantinhoName.classList.add('editable');
            // Remover event listeners anteriores para evitar duplicação
            cantinhoName.removeEventListener('blur', handleCantinhoNameBlur);
            cantinhoName.removeEventListener('keydown', handleCantinhoNameKeydown);
            cantinhoName.addEventListener('blur', handleCantinhoNameBlur);
            cantinhoName.addEventListener('keydown', handleCantinhoNameKeydown);
        }
        if (cantinhoBio) {
            cantinhoBio.contentEditable = 'true';
            cantinhoBio.classList.add('editable');
            cantinhoBio.removeEventListener('blur', handleCantinhoBioBlur);
            cantinhoBio.removeEventListener('keydown', handleCantinhoBioKeydown);
            cantinhoBio.addEventListener('blur', handleCantinhoBioBlur);
            cantinhoBio.addEventListener('keydown', handleCantinhoBioKeydown);
        }
    } else {
        if (cantinhoName) {
            cantinhoName.contentEditable = 'false';
            cantinhoName.classList.remove('editable');
        }
        if (cantinhoBio) {
            cantinhoBio.contentEditable = 'false';
            cantinhoBio.classList.remove('editable');
        }
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

    // Gênero
    if (cantinhoGender) {
        if (profile.show_genero === true && profile.genero) {
            cantinhoGender.textContent = profile.genero;
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
                cantinhoFeedContent.innerHTML = '<p class="feed-loading">Nenhum assunto postado ainda.</p>';
            } else {
                // Renderizar assuntos (reutilizar a lógica de renderização do feed)
                const cards = await Promise.all(assuntos.map(assunto => createAssuntoCard(assunto, profile)));
                cantinhoFeedContent.innerHTML = cards.join('');
            }
        } catch (error) {
            console.error('Erro ao carregar assuntos do usuário:', error);
            cantinhoFeedContent.innerHTML = '<p class="feed-loading">Erro ao carregar assuntos.</p>';
        }
    }

    // Carregar assuntos fixados
    await loadPinnedAssuntos(profile.id);

    // TODO: Carregar marquinhas
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

        // Esconder card no cantinho se não for dono e não tiver assuntos fixados
        if (cantinhoPinnedCard) {
            if (!isOwnProfile && pinnedAssuntos.length === 0) {
                cantinhoPinnedCard.style.display = 'none';
            } else {
                cantinhoPinnedCard.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('Erro ao carregar assuntos fixados:', error);
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
                    row.textContent = 'Link copiado';
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
            createButton.textContent = count >= 3 ? 'Limite atingido' : 'Gerar convite';
        } catch (error) {
            console.error('Erro ao carregar limite de convites:', error);
            countLabel.textContent = '--/3';
        }
    };

    createButton.onclick = async () => {
        createButton.disabled = true;
        createButton.textContent = 'Gerando...';

        try {
            const invite = await createBetaInvite();
            if (!invite?.token) throw new Error('Convite não retornado.');

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

    // Mostrar admin view
    const adminView = document.getElementById('admin-view');
    adminView.classList.remove('hidden');

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
        document.getElementById('admin-users-table').innerHTML = '<tr><td colspan="5">Erro ao carregar usuários</td></tr>';
    }
            }

            // Desbanir usuário
            async function unbanUser(userId) {
    if (!confirm('Tem certeza que deseja desbanir este usuário?')) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ ban_until: null })
            .eq('id', userId);

        if (error) throw error;

        alert('Usuário desbanido com sucesso.');
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
        alert('Erro ao desbanir usuário.');
    }
            }

            // Desilenciar usuário
            async function unsilenceUser(userId) {
    if (!confirm('Tem certeza que deseja desilenciar este usuário?')) return;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ silence_until: null })
            .eq('id', userId);

        if (error) throw error;

        alert('Usuário desilenciado com sucesso.');
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao desilenciar usuário:', error);
        alert('Erro ao desilenciar usuário.');
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
            renderPhotosGrid(cantinhoPhotosGrid, photos, isOwnProfile, userId, cantinhoPhotosCount);
        }

        // Renderizar na sidebar direita (feed)
        if (rightPhotosGrid) {
            renderPhotosGrid(rightPhotosGrid, photos, isOwnProfile, userId, rightPhotosCount);
        }

    } catch (error) {
        console.error('Erro ao carregar fotos:', error);
        if (cantinhoPhotosGrid) cantinhoPhotosGrid.innerHTML = '';
        if (rightPhotosGrid) rightPhotosGrid.innerHTML = '';
    }
            }

            // Renderizar grade de fotos
            function renderPhotosGrid(gridElement, photos, isOwnProfile, userId, countElement) {
    const photosCard = gridElement.closest('.user-photos-card');
    const addPhotoBtn = gridElement.parentElement.querySelector('#btn-add-cantinho-photo');

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
        alert('Erro ao fazer upload de foto: ' + (error.message || 'tente novamente.'));
    }
            }

            // Remover foto do usuário
            async function removeUserPhoto(photoId, userId) {
    if (!currentUser || userId !== currentUser.id) {
        alert('Você só pode remover suas próprias fotos.');
        return;
    }

    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

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
        alert('Erro ao remover foto: ' + (error.message || 'tente novamente.'));
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

    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

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
        alert('Erro ao remover foto: ' + (error.message || 'tente novamente.'));
    }
            }

            // Banir usuário
            async function banUser(userId) {
    const days = prompt('Por quantos dias deseja banir o usuário? (Digite 0 para banir permanentemente)');
    if (days === null) return;

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 0) {
        alert('Por favor, insira um número válido de dias.');
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

        alert(daysNum === 0 ? 'Usuário banido permanentemente.' : `Usuário banido por ${daysNum} dias.`);
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        alert('Erro ao banir usuário.');
    }
            }

            // Silenciar usuário
            async function silenceUser(userId) {
    const days = prompt('Por quantos dias deseja silenciar o usuário?');
    if (days === null) return;

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) {
        alert('Por favor, insira um número válido de dias.');
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

        alert(`Usuário silenciado por ${daysNum} dias.`);
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao silenciar usuário:', error);
        alert('Erro ao silenciar usuário.');
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

        alert('Cargo removido com sucesso.');
        loadAdminRoles();
        loadAdminUsers();
    } catch (error) {
        console.error('Erro ao remover cargo:', error);
        alert('Erro ao remover cargo.');
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
        alert('Função não disponível. Verifique se o Supabase está configurado.');
        return;
    }

    const nameInput = document.getElementById('tag-name-input');
    const emojiInput = document.getElementById('tag-emoji-input');

    const nome = nameInput?.value?.trim();
    const emoji = emojiInput?.value?.trim();

    if (!nome || !emoji) {
        alert('Preencha o nome e o emoji da tag.');
        return;
    }

    try {
        await createTag(nome, emoji);

        alert('Tag criada com sucesso!');

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
        alert('Erro ao criar tag: ' + error.message);
    }
            }

            // Deletar tag
            async function handleDeleteTag(tagId) {
    if (!deleteTag) {
        alert('Função não disponível. Verifique se o Supabase está configurado.');
        return;
    }

    if (!confirm('Tem certeza que deseja deletar esta tag?')) {
        return;
    }

    try {
        await deleteTag(tagId);

        alert('Tag deletada com sucesso!');

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

        alert('Role atualizado com sucesso');
        loadAdminUsers();
        loadAdminRoles();

    } catch (error) {
        console.error('Erro ao alterar role:', error);
        alert('Erro ao alterar role. Verifique se você tem permissão de admin.');
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

        alert('Role atualizado com sucesso');
        loadAdminUsers();

    } catch (error) {
        console.error('Erro ao salvar role:', error);
        alert('Erro ao salvar role');
    }
            }

            // Escanear imagens órfãs
            async function scanOrphanedImages() {
    if (!scanOrphanedImagesRPC) {
        alert('Função não disponível. Verifique se o Supabase está configurado.');
        return;
    }

    try {
        const orphanedImages = await scanOrphanedImagesRPC();

        document.getElementById('orphaned-images-result').classList.remove('hidden');

        if (orphanedImages.length === 0) {
            document.getElementById('orphaned-count').textContent = 'Nenhuma imagem órfã encontrada';
            document.getElementById('orphaned-images-list').innerHTML = '<p>Todas as imagens estão sendo usadas.</p>';
            document.getElementById('btn-delete-orphaned-images').classList.add('hidden');
        } else {
            document.getElementById('orphaned-count').textContent = `${orphanedImages.length} imagens órfãs encontradas`;

            const totalSize = orphanedImages.reduce((sum, img) => sum + (img.size || 0), 0);
            const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

            document.getElementById('orphaned-images-list').innerHTML = `
    <p>Total: ${sizeInMB} MB</p>
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
        alert('Erro ao escanear imagens: ' + error.message);
    }
            }

            // Deletar posts expirados não fixados
            async function handleDeleteExpiredPosts() {
    if (!deleteExpiredPosts) {
        alert('Função não disponível. Verifique se o Supabase está configurado.');
        return;
    }

    if (!confirm('Tem certeza que deseja deletar todos os posts expirados que não estão fixados? Posts fixados serão preservados.')) {
        return;
    }

    try {
        const deletedCount = await deleteExpiredPosts();

        document.getElementById('expired-posts-result').classList.remove('hidden');
        document.getElementById('expired-posts-count').textContent = `${deletedCount} posts deletados`;

        alert(`${deletedCount} posts expirados foram deletados com sucesso.`);

        // Recarregar dashboard para atualizar estatísticas
        loadAdminDashboard();

    } catch (error) {
        console.error('Erro ao deletar posts expirados:', error);
        alert('Erro ao deletar posts expirados: ' + error.message);
    }
            }

            // Deletar imagens órfãs
            async function handleDeleteOrphanedImages() {
    if (!deleteImageFromStorage || !scanOrphanedImagesRPC) {
        alert('Função não disponível. Verifique se o Supabase está configurado.');
        return;
    }

    try {
        // Primeiro, escanear novamente para ter a lista atualizada
        const orphanedImages = await scanOrphanedImagesRPC();

        if (orphanedImages.length === 0) {
            alert('Nenhuma imagem órfã encontrada para deletar.');
            return;
        }

        if (!confirm(`Tem certeza que deseja deletar ${orphanedImages.length} imagens órfãs? Esta ação não pode ser desfeita.`)) {
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
window.setupMBTISection = setupMBTISection;