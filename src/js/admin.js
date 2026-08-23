import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './config.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
const siteUrl = window.location.origin + window.location.pathname.replace(/\/admin\.html$/, '/');
const requestsContainer = document.getElementById('admin-requests');
const feedback = document.getElementById('admin-feedback');
const userLabel = document.getElementById('admin-user-label');

// --- Configurações do Site ---

async function getSiteConfig(key) {
    const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', key)
        .maybeSingle();
    if (error) { console.error('getSiteConfig error:', error); return null; }
    return data?.value ?? null;
}

async function setSiteConfig(key, value) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('site_config')
        .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'key' });
    if (error) throw error;
}

async function loadSiteConfigSection() {
    // Contador de contas
    const totalEl = document.getElementById('stat-siteconfig-total-users');
    if (totalEl) {
        const { count, error } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
        totalEl.textContent = error ? '–' : (count ?? 0);
    }

    // Toggle de cadastro
    const toggle = document.getElementById('toggle-signup-enabled');
    const label = document.getElementById('toggle-signup-label');
    const feedbackEl = document.getElementById('siteconfig-feedback');
    if (!toggle) return;

    const currentVal = await getSiteConfig('signup_enabled');
    const enabled = currentVal !== 'false';
    toggle.checked = enabled;
    if (label) label.textContent = enabled ? 'Cadastro aberto' : 'Cadastro fechado';

    toggle.addEventListener('change', async () => {
        const newVal = toggle.checked ? 'true' : 'false';
        try {
            await setSiteConfig('signup_enabled', newVal);
            if (label) label.textContent = toggle.checked ? 'Cadastro aberto' : 'Cadastro fechado';
            if (feedbackEl) {
                feedbackEl.textContent = toggle.checked
                    ? '✓ Cadastro aberto. O botão "Criar conta" está visível na tela inicial.'
                    : '✓ Cadastro fechado. O botão "Criar conta" foi ocultado da tela inicial.';
                feedbackEl.style.color = 'var(--color-success, #16a34a)';
            }
        } catch (err) {
            console.error(err);
            toggle.checked = !toggle.checked; // reverter visualmente
            if (feedbackEl) {
                feedbackEl.textContent = '✗ Erro ao salvar configuração. Tente novamente.';
                feedbackEl.style.color = 'var(--color-error, #dc2626)';
            }
        }
    });
}

function showFeedback(message, isError = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('hidden');
    feedback.classList.toggle('admin-feedback-error', isError);
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function getStaffUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: isStaff, error: staffError } = await supabase.rpc('is_staff');
    if (staffError || !isStaff) return null;
    return user;
}

async function loadRequests() {
    requestsContainer.innerHTML = '<p class="admin-loading">Carregando pedidos...</p>';

    const { data, error } = await supabase.rpc('admin_list_beta_requests');
    if (error) throw error;

    const requests = data || [];
    if (!requests.length) {
        requestsContainer.innerHTML = '<p class="admin-empty">Nenhum pedido recebido.</p>';
        return;
    }

    requestsContainer.innerHTML = requests.map(request => {
        const statusLabel = request.status === 'pending'
            ? 'Pendente'
            : request.status === 'approved'
                ? 'Aprovado'
                : 'Recusado';
        const createdAt = new Date(request.created_at).toLocaleString('pt-BR');
        const actions = request.status === 'pending' ? `
            <div class="admin-request-actions">
                <button class="btn btn-secondary btn-small" type="button" data-reject-id="${request.id}">Recusar</button>
                <button class="btn btn-primary btn-small" type="button" data-approve-id="${request.id}">Aprovar e enviar</button>
            </div>
        ` : '';

        return `
            <article class="admin-request-card">
                <div class="admin-request-header">
                    <div>
                        <p class="admin-request-email">${escapeHtml(request.email)}</p>
                        <p class="admin-request-meta">Enviado em ${escapeHtml(createdAt)}</p>
                    </div>
                    <span class="admin-request-status">${statusLabel}</span>
                </div>
                ${request.mensagem ? `<p class="admin-request-message">${escapeHtml(request.mensagem)}</p>` : ''}
                ${actions}
            </article>
        `;
    }).join('');

    requestsContainer.querySelectorAll('[data-reject-id]').forEach(button => {
        button.addEventListener('click', () => rejectRequest(button.dataset.rejectId));
    });
    requestsContainer.querySelectorAll('[data-approve-id]').forEach(button => {
        button.addEventListener('click', () => approveRequest(button.dataset.approveId, button));
    });
}

async function rejectRequest(requestId) {
    if (!window.confirm('Recusar este pedido?')) return;

    try {
        const { error } = await supabase.rpc('admin_reject_beta_request', {
            p_request_id: requestId
        });
        if (error) throw error;
        showFeedback('Pedido recusado.');
        await loadRequests();
    } catch (error) {
        console.error(error);
        showFeedback('Não foi possível recusar o pedido.', true);
    }
}

async function approveRequest(requestId, button) {
    if (!window.confirm('Aprovar e enviar um convite para este e-mail?')) return;

    button.disabled = true;
    button.textContent = 'Enviando...';

    try {
        const { data, error } = await supabase.rpc('admin_approve_beta_request', {
            p_request_id: requestId
        });
        if (error) throw error;

        const invite = Array.isArray(data) ? data[0] : data;
        if (!invite?.token || !invite?.email) throw new Error('Convite não retornado pelo banco.');

        const inviteUrl = `${siteUrl}?invite=${encodeURIComponent(invite.token)}`;

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) throw new Error('Sessão expirada. Entre novamente.');

        const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/send-beta-invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                email: invite.email,
                token: invite.token,
                expires_at: invite.expires_at,
                site_url: siteUrl
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Falha no envio do e-mail.');
        }

        showFeedback(`Convite enviado para ${invite.email}.`);
        await loadRequests();
    } catch (error) {
        console.error(error);
        if (typeof inviteUrl !== 'undefined') {
            window.prompt('O envio falhou. Copie este convite e envie manualmente:', inviteUrl);
        }
        showFeedback(`A aprovação foi iniciada, mas o envio falhou: ${error.message}`, true);
        await loadRequests();
    }
}

async function start() {
    try {
        const user = await getStaffUser();
        if (!user) {
            userLabel.textContent = 'Acesso negado.';
            requestsContainer.innerHTML = '<p class="admin-empty">Você não tem permissão para acessar este painel.</p>';
            return;
        }

        userLabel.textContent = `Conectado como ${user.email}`;
        await Promise.all([
            loadRequests(),
            loadSiteConfigSection()
        ]);
    } catch (error) {
        console.error(error);
        userLabel.textContent = 'Erro ao verificar permissões.';
        requestsContainer.innerHTML = '<p class="admin-empty">Não foi possível carregar o painel.</p>';
    }
}

document.getElementById('admin-refresh')?.addEventListener('click', loadRequests);
document.getElementById('admin-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = './';
});

start();
