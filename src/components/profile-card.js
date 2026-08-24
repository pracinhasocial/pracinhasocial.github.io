/**
 * Componente ProfileCard
 * Funções para atualizar cards de perfil em diferentes locais
 */

import { t } from '../js/translations.js';

/**
 * Template HTML do card de perfil
 */
const PROFILE_CARD_TEMPLATE = `
<div class="sidebar-card profile-preview-card">
    <h1 class="profile-apelido-title" id="{prefix}-apelido">Visitante</h1><br>
    <div class="profile-header-widget">
        <div class="profile-info-column">
            <div class="profile-card-top-row">
                <div>
                    <span class="profile-name-small hidden" id="{prefix}-name">Nome</span>
                    <span class="profile-username" id="{prefix}-username">usuário</span>
                    <span class="profile-age" id="{prefix}-age">Idade</span>
                    <span class="profile-gender" id="{prefix}-gender">Gênero</span>
                    <span class="profile-mbti" id="{prefix}-mbti">MBTI</span>
                    <span class="profile-sexuality" id="{prefix}-sexuality">Sexualidade</span>
                    <span class="profile-location" id="{prefix}-location">
                        <span class="loc-text">Local</span>
                    </span>
                    <a href="#" class="profile-site field-link" id="{prefix}-site" target="_blank">
                        <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                    </a>
                    <i><p class="profile-bio" id="{prefix}-bio">"Uma bio curtamente incrível."</p></i>
                </div>
            </div>
        </div>
        <div class="profile-avatar-column">
            <div class="profile-avatar-wrapper">
                <div class="avatar-large" id="{prefix}-avatar-container">
                    <img src="" alt="Avatar" id="{prefix}-avatar" class="profile-avatar-large">
                </div>
            </div>
            <div class="profile-badges-row" id="{prefix}-badges-row">
                <span class="profile-badge" title="Musical">🎵</span>
                <span class="profile-badge" title="Engraçado">😆</span>
                <span class="profile-badge" title="Noturno">🌙</span>
            </div>
        </div>
    </div>
</div>
`;

/**
 * Injeta o card de perfil no DOM
 * @param {string} containerId - ID do container onde injetar o card
 * @param {string} prefix - Prefixo dos IDs dos elementos (ex: 'right-profile', 'cantinho', 'public-profile')
 */
export function injectProfileCard(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} não encontrado`);
        return;
    }

    let html = PROFILE_CARD_TEMPLATE.replace(/{prefix}/g, prefix);

    // Se o container já for um card lateral (`.sidebar-card`), não inserir um wrapper extra
    if (container.classList.contains('sidebar-card')) {
        html = html.replace(/^<div[^>]*>/, '').replace(/<\/div>\s*$/, '');
    }

    container.innerHTML = html;

    // Não chamar updateLanguageUI aqui pois isso sobrescreve os valores definidos
    // A tradução deve ser feita apenas nos textos que ainda não foram definidos
}

/**
 * Gera avatar URL (foto ou iniciais)
 */
function getAvatarUrl(profile) {
    if (profile?.fotos && profile.fotos.length > 0) {
        return profile.fotos[0];
    }
    
    // Avatar padrão com iniciais
    const initials = profile?.apelido?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                     profile?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#D4C4A8"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="80" fill="#4A7C59" font-family="Arial">${initials}</text>
        </svg>
    `)}`;
}

/**
 * Atualiza um card de perfil específico
 * @param {Object} profile - Dados do perfil
 * @param {string} prefix - Prefixo dos IDs dos elementos (ex: 'right-profile', 'cantinho', 'public-profile')
 * @param {Object} options - Opções extras
 * @param {boolean} options.isOwner - Se é o próprio perfil (habilita edição)
 */
export function updateProfileCard(profile, prefix, options = {}) {
    const { isOwner = false } = options;
    
    if (!profile) {
        console.error('updateProfileCard: profile is null');
        return;
    }

    // Elementos do card
    const avatar = document.getElementById(`${prefix}-avatar`);
    const apelido = document.getElementById(`${prefix}-apelido`);
    const name = document.getElementById(`${prefix}-name`);
    const username = document.getElementById(`${prefix}-username`);
    const age = document.getElementById(`${prefix}-age`);
    const gender = document.getElementById(`${prefix}-gender`);
    const sexuality = document.getElementById(`${prefix}-sexuality`);
    const mbti = document.getElementById(`${prefix}-mbti`);
    const location = document.getElementById(`${prefix}-location`) || document.getElementById(`${prefix}-pais`);
    const site = document.getElementById(`${prefix}-site`);
    const bio = document.getElementById(`${prefix}-bio`);
    const music = document.getElementById(`${prefix}-music`) || document.getElementById(`${prefix}-musica`);

    // Atualizar avatar
    if (avatar) {
        avatar.src = getAvatarUrl(profile);
    }

    // Atualizar apelido
    if (apelido) {
        apelido.textContent = profile.apelido || profile.nome || 'Visitante';
    }

    // Atualizar nome (com opção de mostrar)
    if (name) {
        if (profile.show_name !== false && profile.nome) {
            name.textContent = profile.nome;
            name.classList.remove('hidden');
        } else {
            name.classList.add('hidden');
        }
    }

    // Atualizar username
    if (username) {
        username.textContent = profile.username || '';
    }

    // Atualizar idade
    if (age) {
        if (profile.show_idade !== false && profile.data_nascimento) {
            const birthDate = new Date(profile.data_nascimento);
            const today = new Date();
            const calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const currentLanguage = window.currentLanguage || 'pt-BR';
            age.textContent = `${calculatedAge} ${t('profile.yearsOld', currentLanguage)}`;
            age.classList.remove('hidden');
        } else {
            age.classList.add('hidden');
        }
    }

    // Atualizar gênero
    if (gender) {
        if (profile.show_genero !== false && profile.genero) {
            gender.textContent = profile.genero;
            gender.classList.remove('hidden');
        } else {
            gender.classList.add('hidden');
        }
    }

    // Atualizar sexualidade
    if (sexuality) {
        if (profile.show_sexualidade !== false && profile.sexualidade) {
            sexuality.textContent = profile.sexualidade;
            sexuality.classList.remove('hidden');
        } else {
            sexuality.classList.add('hidden');
        }
    }

    // Atualizar MBTI
    if (mbti) {
        if (profile.show_mbti !== false && profile.mbti) {
            mbti.textContent = profile.mbti;
            mbti.classList.remove('hidden');
        } else {
            mbti.classList.add('hidden');
        }
    }

    // Atualizar localização
    if (location) {
        const locText = location.querySelector('.loc-text');
        const currentLanguage = window.currentLanguage || 'pt-BR';
        if (locText) {
            locText.textContent = profile.local || profile.pais || t('profile.fromSomewhere', currentLanguage);
        } else {
            location.textContent = profile.local || profile.pais || '';
        }
    }

    // Atualizar site
    if (site) {
        if (profile.show_site !== false && profile.site_url) {
            site.href = profile.site_url;
            site.target = '_blank';
            site.rel = 'noopener';
            site.style.display = 'inline-block';
        } else {
            site.style.display = 'none';
        }
    }

    // Atualizar bio
    if (bio) {
        bio.textContent = profile.bio || '';
    }

    // Atualizar música
    if (music) {
        music.textContent = profile.musica || '';
    }
}

/**
 * Atualiza o card de perfil do feed (sidebar direita)
 */
export function updateFeedProfileCard(profile) {
    updateProfileCard(profile, 'right-profile', { isOwner: false });
}

/**
 * Atualiza o card de perfil do cantinho
 */
export function updateCantinhoProfileCard(profile, isOwner = false) {
    updateProfileCard(profile, 'cantinho', { isOwner });
}

/**
 * Atualiza o card de perfil público
 */
export function updatePublicProfileCard(profile) {
    updateProfileCard(profile, 'public-profile', { isOwner: false });
}
