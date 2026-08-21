import { supabase } from './supabase-client.js';

// Verificar token na URL
const urlParams = new URLSearchParams(window.location.search);
const recoveryToken = urlParams.get('token');

if (!recoveryToken) {
    document.getElementById('recover-account-form').classList.add('hidden');
    document.getElementById('recover-error').classList.remove('hidden');
} else {
    document.getElementById('recover-account-btn').addEventListener('click', async () => {
        const btn = document.getElementById('recover-account-btn');
        btn.disabled = true;
        btn.textContent = 'Recuperando...';

        try {
            // Chamar função de restauração
            const { data, error } = await supabase
                .rpc('restore_account', { p_recovery_token: recoveryToken });

            if (error) throw error;

            if (data === true) {
                document.getElementById('recover-account-form').classList.add('hidden');
                document.getElementById('recover-success').classList.remove('hidden');
            } else {
                document.getElementById('recover-account-form').classList.add('hidden');
                document.getElementById('recover-error').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erro ao recuperar conta:', error);
            document.getElementById('recover-account-form').classList.add('hidden');
            document.getElementById('recover-error').classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Recuperar Conta';
        }
    });
}
