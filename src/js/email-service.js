// Serviço de envio de emails
// Este arquivo contém funções para enviar emails através de diferentes serviços

// Opção 1: Usar Supabase Edge Functions (recomendado)
async function sendAccessEmailViaEdgeFunction(email, accessToken, expiresAt) {
    try {
        const response = await fetch('/functions/send-access-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                accessToken,
                expiresAt,
                signupUrl: `${window.location.origin}/signup?token=${accessToken}`
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send email via Edge Function');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending email via Edge Function:', error);
        throw error;
    }
}

// Opção 2: Usar SendGrid (requer API key)
async function sendAccessEmailViaSendGrid(email, accessToken, expiresAt) {
    const SENDGRID_API_KEY = 'YOUR_SENDGRID_API_KEY';
    const FROM_EMAIL = 'noreply@pracinha.com';

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email }],
                    subject: 'Seu link de acesso para a Pracinha'
                }],
                from: { email: FROM_EMAIL },
                content: [{
                    type: 'text/html',
                    value: `
                        <h2>Bem-vindo à Pracinha!</h2>
                        <p>Seu link de acesso está pronto:</p>
                        <p><a href="${window.location.origin}/signup?token=${accessToken}">Clique aqui para criar sua conta</a></p>
                        <p>Este link expira em: ${new Date(expiresAt).toLocaleString('pt-BR')}</p>
                        <p>Se você não solicitou este acesso, ignore este email.</p>
                    `
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send email via SendGrid');
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending email via SendGrid:', error);
        throw error;
    }
}

// Opção 3: Usar Resend (alternativa simples)
async function sendAccessEmailViaResend(email, accessToken, expiresAt) {
    const RESEND_API_KEY = 'YOUR_RESEND_API_KEY';

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Pracinha <noreply@pracinha.com>',
                to: [email],
                subject: 'Seu link de acesso para a Pracinha',
                html: `
                    <h2>Bem-vindo à Pracinha!</h2>
                    <p>Seu link de acesso está pronto:</p>
                    <p><a href="${window.location.origin}/signup?token=${accessToken}">Clique aqui para criar sua conta</a></p>
                    <p>Este link expira em: ${new Date(expiresAt).toLocaleString('pt-BR')}</p>
                    <p>Se você não solicitou este acesso, ignore este email.</p>
                `
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send email via Resend');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending email via Resend:', error);
        throw error;
    }
}

// Função principal para enviar email de acesso
// Escolha o serviço desejado alterando a função chamada abaixo
export async function sendAccessEmail(email, accessToken, expiresAt) {
    // Por enquanto, retorna sucesso sem enviar email real
    // Quando configurar um serviço de email, remova este return e use uma das funções acima
    
    // DEBUG: email sending disabled in development
    
    // TODO: Descomentar uma das opções abaixo quando configurar o serviço de email
    
    // Opção 1: Edge Functions (recomendado)
    // return await sendAccessEmailViaEdgeFunction(email, accessToken, expiresAt);
    
    // Opção 2: SendGrid
    // return await sendAccessEmailViaSendGrid(email, accessToken, expiresAt);
    
    // Opção 3: Resend
    // return await sendAccessEmailViaResend(email, accessToken, expiresAt);
    
    return { success: true, message: 'Email não configurado - modo desenvolvimento' };
}
