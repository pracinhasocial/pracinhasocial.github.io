/**
 * Componente Header - Injeta o header da Pracinha no DOM
 */

import { t } from '../js/translations.js';

/**
 * HTML do header como string literal para evitar problemas com Live Server
 */
const headerHTML = `<header class="header">
    <div class="logo-section">
        <div class="logo-small">
            <img src="src/components/logo.webp" alt="Pracinha Logo" class="logo-img-small">
            <div class="logo-text-group">
                <span class="logo-text-small">Pracinha</span>
                <span class="logo-tagline" data-i18n="header.tagline">um mini-espaço social.</span>
            </div>
        </div>
    </div>

    <nav class="header-nav">
        <!-- Botão Início -->
        <a href="#" class="nav-item active" id="nav-item-pracinha">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 20h10"></path>
                <path d="M10 20c5.5-2.5.8-7.5 3-10"></path>
                <path d="M14 10c-.5-2.5.5-5 2-6 1.5 1 2.5 3.5 2 6-1.5 0-3-1-4-2"></path>
                <path d="M10 10c.5-2.5-.5-5-2-6-1.5 1-2.5 3.5-2 6 1.5 0 3-1 4-2"></path>
            </svg>
            <span class="nav-label" data-i18n="nav.home">Início</span>
        </a>

        <!-- Botão dinâmico para mostrar apelido do dono do cantinho -->
        <a href="#" class="nav-item hidden" id="nav-item-cantinho-dono">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span class="nav-label" id="cantinho-dono-label" data-i18n="nav.visitor">Visitante</span>
        </a>

        <!-- Botão Meu Cantinho -->
        <a href="#" class="nav-item" id="nav-item-meu-cantinho">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="nav-label" data-i18n="nav.myCantinho">Meu Cantinho</span>
        </a>

        <!-- Botão Descobrir alguém -->
        <a href="#" class="nav-item" id="nav-item-descobrir" onclick="handleDarVolta(); return false;">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
            <span class="nav-label" data-i18n="nav.discover">Descobrir alguém</span>
        </a>

        <!-- Botão Cineminha -->
        <a href="#" class="nav-item" id="nav-item-cineminha">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
            <span class="nav-label" data-i18n="nav.cineminha">Cineminha</span>
        </a>
    </nav>

    <div class="header-actions">
        
        <!-- Modo Dia/Noite (desktop) -->
        <button class="theme-toggle desktop-only" id="theme-toggle-main">🌙</button>
        
        <!-- Botão de Notificações -->
        <div class="notifications-container">
            <button class="bell-btn" id="btn-notifications" data-i18n-attr="title:nav.notifications" type="button">
                <span class="notification-badge hidden" id="notification-badge">0</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-icon lucide-bell" id="bell-icon"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-ring-icon lucide-bell-ring hidden" id="bell-ring-icon"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M20.2 6 3 11"/><path d="m21 3-9 9"/><path d="m21 9-9-9"/>
                </svg>
            </button>
            <div class="notifications-dropdown" id="notifications-dropdown">
                <div class="notifications-header">
                    <span data-i18n="notif.title">Notificações</span>
                </div>
                <div class="notifications-list" id="notifications-list"></div>
                <button type="button" class="notifications-mark-read" id="notifications-mark-read"
                    data-i18n="notif.markAllRead">Marcar todas como lidas</button>
            </div>
        </div>
        
        <!-- Botão Admin (só para admin e moderators) - desktop -->
        <button class="header-action-btn desktop-only" id="btn-admin" style="display: none;" data-i18n-attr="title:nav.admin">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-user-icon lucide-shield-user"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M6.376 18.91a6 6 0 0 1 11.249.003"/>
            <circle cx="12" cy="11" r="4"/>
            </svg>
        </button>
        
        <!-- Botão Configurações - desktop only -->
        <button class="header-action-btn desktop-only" id="btn-configuracoes" data-i18n-attr="title:nav.settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>
        
        <!-- Botão Ajuda - desktop only -->
        <button class="header-action-btn desktop-only" id="btn-ajuda" data-i18n-attr="title:nav.help">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        </button>
        
        <!-- Botão Logout - desktop only -->
        <button class="header-action-btn desktop-only" id="btn-logout" data-i18n-attr="title:nav.logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        </button>

        <!-- Mobile Menu Dropdown -->
        <div class="mobile-menu-container">
            <button class="mobile-menu-btn" id="mobile-menu-btn" data-i18n-attr="title:nav.menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>
            <div class="mobile-menu-dropdown" id="mobile-menu-dropdown">
                <!-- Modo Dia/Noite -->
                <button class="mobile-menu-item" id="theme-toggle-mobile">
                    <span data-i18n="nav.theme">🌙 Tema</span>
                </button>
                <!-- Botão Admin (só para admin e moderators) -->
                <button class="mobile-menu-item admin-only" id="btn-admin-mobile" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-user-icon lucide-shield-user"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M6.376 18.91a6 6 0 0 1 11.249.003"/>
                    <circle cx="12" cy="11" r="4"/>
                    </svg>
                    <span data-i18n="nav.admin">Admin</span>
                </button>
                <!-- Botão Ajuda -->
                <button class="mobile-menu-item" id="btn-ajuda-mobile">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span data-i18n="nav.help">Ajuda</span>
                </button>
                <!-- Botão Logout -->
                <button class="mobile-menu-item" id="btn-logout-mobile">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span data-i18n="nav.logout">Sair</span>
                </button>
            </div>
        </div>
    </div>
</header>`;

/**
 * Injeta o header no DOM
 * @param {string} containerId - ID do container onde injetar o header (padrão: 'header-container')
 * @param {Function} initCallback - Função de callback para inicializar os elementos do header (opcional)
 */
export async function injectHeader(containerId = 'header-container', initCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} não encontrado`);
        return;
    }

    try {
        container.innerHTML = headerHTML;

        // Verificar se os elementos foram criados
        const btnNotifications = container.querySelector('#btn-notifications');
        const notificationsDropdown = container.querySelector('#notifications-dropdown');

        // Chamar callback de inicialização se fornecido
        if (initCallback) {
            initCallback();
        }

        // Atualizar textos do header com o idioma atual
        if (typeof window.updateLanguageUI === 'function') {
            window.updateLanguageUI();
        }
    } catch (error) {
        console.error('Erro ao injetar header:', error);
    }
}
