// Sistema de Teste de Personalidade Inspirado no MBTI para Pracinha

// Importar updateUserProfile diretamente
let updateUserProfile = null;

// Tentar importar a função do supabase-client
try {
    const supabaseModule = await import('./supabase-client.js');
    updateUserProfile = supabaseModule.updateUserProfile;
} catch (error) {
    console.error('Erro ao importar updateUserProfile no mbti-test:', error);
}

// Variáveis globais serão acessadas via window (expostas pelo main.js)
// currentProfile, currentUser

// Perguntas do teste
const questions = [
    // DIMENSÃO E/I (Energia)
    {
        dimension: 'EI',
        question: 'Você chega a uma festa onde conhece poucas pessoas.',
        options: [
            { text: 'Vou conversar e conhecer gente nova.', value: 'E' },
            { text: 'Prefiro encontrar um lugar tranquilo e conversar com poucas pessoas.', value: 'I' }
        ]
    },
    {
        dimension: 'EI',
        question: 'Depois de passar um dia inteiro com muitas pessoas...',
        options: [
            { text: 'Ainda fico animado para continuar socializando.', value: 'E' },
            { text: 'Sinto vontade de ficar um tempo sozinho.', value: 'I' }
        ]
    },
    {
        dimension: 'EI',
        question: 'Quando surge um assunto interessante...',
        options: [
            { text: 'Gosto de falar minhas ideias na hora.', value: 'E' },
            { text: 'Prefiro pensar antes de comentar.', value: 'I' }
        ]
    },
    {
        dimension: 'EI',
        question: 'Você tem um sábado livre.',
        options: [
            { text: 'Procuro algo para fazer com outras pessoas.', value: 'E' },
            { text: 'Aproveito para fazer algo sozinho ou com poucas pessoas.', value: 'I' }
        ]
    },
    // DIMENSÃO S/N (Informação)
    {
        dimension: 'SN',
        question: 'Quando aprende algo novo...',
        options: [
            { text: 'Prefiro exemplos práticos.', value: 'S' },
            { text: 'Gosto de entender as ideias por trás.', value: 'N' }
        ]
    },
    {
        dimension: 'SN',
        question: 'Ao observar uma obra de arte...',
        options: [
            { text: 'Reparo primeiro nos detalhes.', value: 'S' },
            { text: 'Penso no significado que ela transmite.', value: 'N' }
        ]
    },
    {
        dimension: 'SN',
        question: 'Você recebe um projeto novo.',
        options: [
            { text: 'Quero instruções claras.', value: 'S' },
            { text: 'Gosto de descobrir caminhos diferentes.', value: 'N' }
        ]
    },
    {
        dimension: 'SN',
        question: 'Quando lê um livro...',
        options: [
            { text: 'Gosto de histórias bem concretas.', value: 'S' },
            { text: 'Gosto de imaginar possibilidades além do que está escrito.', value: 'N' }
        ]
    },
    // DIMENSÃO T/F (Decisão)
    {
        dimension: 'TF',
        question: 'Um amigo pede sua opinião.',
        options: [
            { text: 'Digo exatamente o que penso.', value: 'T' },
            { text: 'Tento falar de um jeito que não o machuque.', value: 'F' }
        ]
    },
    {
        dimension: 'TF',
        question: 'Ao resolver um conflito...',
        options: [
            { text: 'Procuro a solução mais lógica.', value: 'T' },
            { text: 'Procuro a solução que preserve as relações.', value: 'F' }
        ]
    },
    {
        dimension: 'TF',
        question: 'Em um trabalho em grupo...',
        options: [
            { text: 'O importante é que fique correto.', value: 'T' },
            { text: 'O importante é que todos se sintam bem participando.', value: 'F' }
        ]
    },
    {
        dimension: 'TF',
        question: 'Você precisa escolher entre duas opções.',
        options: [
            { text: 'Analiso vantagens e desvantagens.', value: 'T' },
            { text: 'Sigo aquilo que parece mais certo para mim.', value: 'F' }
        ]
    },
    // DIMENSÃO J/P (Organização)
    {
        dimension: 'JP',
        question: 'Antes de viajar...',
        options: [
            { text: 'Faço um planejamento.', value: 'J' },
            { text: 'Decido boa parte durante a viagem.', value: 'P' }
        ]
    },
    {
        dimension: 'JP',
        question: 'Quando começa um projeto...',
        options: [
            { text: 'Gosto de definir etapas.', value: 'J' },
            { text: 'Vou adaptando conforme avanço.', value: 'P' }
        ]
    },
    {
        dimension: 'JP',
        question: 'Seu dia muda de repente.',
        options: [
            { text: 'Isso me incomoda.', value: 'J' },
            { text: 'Costumo lidar bem com mudanças.', value: 'P' }
        ]
    },
    {
        dimension: 'JP',
        question: 'Sua mesa de trabalho normalmente é...',
        options: [
            { text: 'Organizada.', value: 'J' },
            { text: 'Um pouco bagunçada, mas eu sei onde está tudo.', value: 'P' }
        ]
    }
];

// Perguntas de desempate
const tieBreakerQuestions = {
    EI: {
        question: 'Você se sente mais energizado em situações:',
        options: [
            { text: 'Com muitas pessoas ao redor.', value: 'E' },
            { text: 'Em momentos de reflexão individual.', value: 'I' }
        ]
    },
    SN: {
        question: 'Você prefere focar em:',
        options: [
            { text: 'Fatos e detalhes concretos.', value: 'S' },
            { text: 'Padrões e possibilidades futuras.', value: 'N' }
        ]
    },
    TF: {
        question: 'Ao tomar decisões importantes, você prioriza:',
        options: [
            { text: 'Lógica e análise objetiva.', value: 'T' },
            { text: 'Valores pessoais e impacto emocional.', value: 'F' }
        ]
    },
    JP: {
        question: 'Você prefere:',
        options: [
            { text: 'Ter tudo planejado com antecedência.', value: 'J' },
            { text: 'Manter opções abertas e flexíveis.', value: 'P' }
        ]
    }
};

// Descrições dos 16 tipos
const typeDescriptions = {
    ISTJ: 'Uma pessoa organizada, prática e confiável, que valoriza tradição e estabilidade.',
    ISFJ: 'Uma pessoa atenciosa, leal e detalhista, que se preocupa com o bem-estar dos outros.',
    INFJ: 'Uma pessoa visionária, intuitiva e compassiva, que busca significado e propósito.',
    INTJ: 'Uma pessoa estratégica, que gosta de planejar, entender sistemas e criar soluções.',
    ISTP: 'Uma pessoa prática, analítica e flexível, que gosta de resolver problemas concretos.',
    ISFP: 'Uma pessoa artística, gentil e espontânea, que valoriza a autenticidade.',
    INFP: 'Uma pessoa imaginativa, guiada por valores pessoais e curiosa sobre novas possibilidades.',
    INTP: 'Uma pessoa analítica, curiosa e independente, que busca entender como as coisas funcionam.',
    ESTP: 'Uma pessoa enérgica, prática e adaptável, que gosta de ação e desafios.',
    ESFP: 'Uma pessoa alegre, espontânea e entusiasta, que vive o momento com intensidade.',
    ENFP: 'Uma pessoa criativa, curiosa e motivada por novas experiências e conexões.',
    ENTP: 'Uma pessoa inovadora, eloquente e questionadora, que adora debater ideias.',
    ESTJ: 'Uma pessoa organizada, direta e responsável, que valoriza ordem e eficiência.',
    ESFJ: 'Uma pessoa calorosa, colaborativa e atenciosa, que se preocupa com harmonia social.',
    ENFJ: 'Uma pessoa carismática, inspiradora e empática, que motiva os outros.',
    ENTJ: 'Uma pessoa confiante, estratégica e determinada, que lidera com clareza.'
};

// Estado do teste
let mbtiState = {
    currentQuestion: 0,
    scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
    tieBreakers: [],
    isTieBreaker: false,
    currentTieBreakerDimension: null
};

// Função para abrir o modal do teste
function openMBTITest() {
    const modal = document.getElementById('mbti-test-modal');
    if (modal) {
        resetMBTITest();
        modal.classList.remove('hidden');
        showQuestion(0);
    }
}

// Função para fechar o modal do teste
function closeMBTITest() {
    const modal = document.getElementById('mbti-test-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Função para resetar o teste
function resetMBTITest() {
    mbtiState = {
        currentQuestion: 0,
        scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
        tieBreakers: [],
        isTieBreaker: false,
        currentTieBreakerDimension: null
    };
}

// Função para mostrar uma pergunta
function showQuestion(index) {
    const questionContainer = document.getElementById('mbti-question-container');
    const progressBar = document.getElementById('mbti-progress-bar');
    const progressText = document.getElementById('mbti-progress-text');
    
    if (!questionContainer) return;
    
    const isTieBreaker = mbtiState.isTieBreaker;
    const currentQuestions = isTieBreaker 
        ? [tieBreakerQuestions[mbtiState.currentTieBreakerDimension]]
        : questions;
    
    const question = currentQuestions[index];
    const totalQuestions = isTieBreaker ? 1 : questions.length;
    
    // Atualizar progresso
    const progress = ((index + 1) / totalQuestions) * 100;
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
        progressText.textContent = isTieBreaker 
            ? 'Pergunta de desempate'
            : `Pergunta ${index + 1} de ${totalQuestions}`;
    }
    
    // Criar HTML da pergunta com animação
    questionContainer.innerHTML = `
        <div class="mbti-question-card fade-in">
            <p class="mbti-question-text">${question.question}</p>
            <div class="mbti-options">
                ${question.options.map((option, i) => `
                    <button class="mbti-option-btn" data-value="${option.value}" data-index="${i}">
                        ${option.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    // Adicionar event listeners
    const optionButtons = questionContainer.querySelectorAll('.mbti-option-btn');
    optionButtons.forEach(btn => {
        btn.addEventListener('click', handleAnswer);
    });
}

// Função para lidar com a resposta
function handleAnswer(e) {
    const value = e.target.dataset.value;
    const dimension = mbtiState.isTieBreaker 
        ? mbtiState.currentTieBreakerDimension
        : questions[mbtiState.currentQuestion].dimension;
    
    if (mbtiState.isTieBreaker) {
        // Pergunta de desempate
        mbtiState.scores[value]++;
        mbtiState.isTieBreaker = false;
        mbtiState.currentTieBreakerDimension = null;
        showResult();
    } else {
        // Pergunta normal
        mbtiState.scores[value]++;
        mbtiState.currentQuestion++;
        
        if (mbtiState.currentQuestion < questions.length) {
            showQuestion(mbtiState.currentQuestion);
        } else {
            checkTieBreakers();
        }
    }
}

// Função para verificar empates
function checkTieBreakers() {
    const dimensions = [
        { dim: 'EI', values: ['E', 'I'] },
        { dim: 'SN', values: ['S', 'N'] },
        { dim: 'TF', values: ['T', 'F'] },
        { dim: 'JP', values: ['J', 'P'] }
    ];
    
    for (const { dim, values } of dimensions) {
        const [val1, val2] = values;
        if (mbtiState.scores[val1] === mbtiState.scores[val2]) {
            mbtiState.tieBreakers.push(dim);
        }
    }
    
    if (mbtiState.tieBreakers.length > 0) {
        // Mostrar pergunta de desempate para a primeira dimensão empatada
        mbtiState.isTieBreaker = true;
        mbtiState.currentTieBreakerDimension = mbtiState.tieBreakers[0];
        showQuestion(0);
    } else {
        showResult();
    }
}

// Função para calcular e mostrar o resultado
function showResult() {
    const type = calculateMBTIType();
    const percentages = calculatePercentages();
    const description = typeDescriptions[type];
    
    const questionContainer = document.getElementById('mbti-question-container');
    const progressBar = document.getElementById('mbti-progress-bar');
    const progressText = document.getElementById('mbti-progress-text');
    
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    if (progressText) {
        progressText.textContent = 'Resultado';
    }
    
    if (questionContainer) {
        questionContainer.innerHTML = `
            <div class="mbti-result-card fade-in">
                <div class="mbti-result-icon">🧠</div>
                <h2 class="mbti-result-title">Seu tipo de personalidade</h2>
                <div class="mbti-result-type">${type}</div>
                <p class="mbti-result-description">${description}</p>
                
                <div class="mbti-percentages">
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Energia:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.EI.primary} ${percentages.EI.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Informação:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.SN.primary} ${percentages.SN.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Decisão:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.TF.primary} ${percentages.TF.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Organização:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.JP.primary} ${percentages.JP.primaryPercent}%
                        </span>
                    </div>
                </div>
                
                <div class="mbti-result-actions">
                    <button class="btn btn-primary btn-full" id="mbti-save-result">Salvar resultado</button>
                    <button class="btn btn-secondary btn-full" id="mbti-close-result">Fechar</button>
                </div>
            </div>
        `;
        
        // Adicionar event listeners
        const saveBtn = document.getElementById('mbti-save-result');
        const closeBtn = document.getElementById('mbti-close-result');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => saveMBTIResult(type, mbtiState.scores));
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMBTITest);
        }
    }
}

// Função para calcular o tipo MBTI
function calculateMBTIType() {
    const dimensions = [
        { val1: 'E', val2: 'I' },
        { val1: 'S', val2: 'N' },
        { val1: 'T', val2: 'F' },
        { val1: 'J', val2: 'P' }
    ];
    
    let type = '';
    for (const { val1, val2 } of dimensions) {
        type += mbtiState.scores[val1] >= mbtiState.scores[val2] ? val1 : val2;
    }
    
    return type;
}

// Função para calcular porcentagens
function calculatePercentages() {
    const dimensions = [
        { key: 'EI', val1: 'E', val2: 'I', label1: 'Extroversão', label2: 'Introversão' },
        { key: 'SN', val1: 'S', val2: 'N', label1: 'Sensação', label2: 'Intuição' },
        { key: 'TF', val1: 'T', val2: 'F', label1: 'Pensamento', label2: 'Sentimento' },
        { key: 'JP', val1: 'J', val2: 'P', label1: 'Julgamento', label2: 'Percepção' }
    ];
    
    const result = {};
    for (const { key, val1, val2, label1, label2 } of dimensions) {
        const total = mbtiState.scores[val1] + mbtiState.scores[val2];
        const percent1 = total > 0 ? Math.round((mbtiState.scores[val1] / total) * 100) : 50;
        const percent2 = 100 - percent1;
        
        result[key] = {
            primary: mbtiState.scores[val1] >= mbtiState.scores[val2] ? label1 : label2,
            primaryPercent: mbtiState.scores[val1] >= mbtiState.scores[val2] ? percent1 : percent2,
            secondary: mbtiState.scores[val1] >= mbtiState.scores[val2] ? label2 : label1,
            secondaryPercent: mbtiState.scores[val1] >= mbtiState.scores[val2] ? percent2 : percent1
        };
    }
    
    return result;
}

// Função para salvar o resultado no Supabase
async function saveMBTIResult(type, scores) {
    try {
        // Usar a função importada diretamente ou a global
        const updateUserProfileFunc = updateUserProfile || window.updateUserProfile;
        const currentUser = window.currentUser;
        const currentProfileLocal = window.currentProfile;
        const getUserProfileFunc = window.getUserProfile;
        
        
        
        if (typeof updateUserProfileFunc === 'function' && currentUser) {
            const mbtiResult = {
                type: type,
                scores: scores
            };
            
            
            
            const result = await updateUserProfileFunc(currentUser.id, {
                mbti: type,
                mbti_result: mbtiResult
            });
            
            
            
            // Recarregar perfil do Supabase para ter dados atualizados
            if (typeof getUserProfileFunc === 'function') {
                const updatedProfile = await getUserProfileFunc(currentUser.id);
                if (updatedProfile) {
                    window.currentProfile = updatedProfile;
                    
                }
            }
            
            // Fechar modal e atualizar UI
            closeMBTITest();
            
            // Mostrar notificação de sucesso
            showNotification('Resultado salvo com sucesso!');
            
            // Atualizar a seção MBTI
            if (typeof setupMBTISection === 'function') {
                setupMBTISection();
            }
            
            // Atualizar a sidebar-right se estiver visível
            if (typeof loadProfileData === 'function') {
                loadProfileData();
            }
        } else {
            console.error('Função updateUserProfile não disponível ou usuário não autenticado');
            console.error('updateUserProfile local disponível:', typeof updateUserProfile);
            console.error('updateUserProfile global disponível:', typeof window.updateUserProfile);
            console.error('currentUser disponível:', currentUser);
            showNotification('Erro ao salvar resultado: usuário não autenticado');
        }
    } catch (error) {
        console.error('Erro ao salvar resultado MBTI:', error);
        showNotification('Erro ao salvar resultado: ' + error.message);
    }
}

// Função para mostrar resultado salvo
function showMBTIResultDetail() {
    const currentProfileLocal = window.currentProfile;
    if (!currentProfileLocal || !currentProfileLocal.mbti_result) return;
    
    const result = currentProfileLocal.mbti_result;
    const type = result.type;
    const scores = result.scores;
    const description = typeDescriptions[type];
    
    // Recalcular porcentagens
    const tempScores = { ...mbtiState.scores, ...scores };
    mbtiState.scores = tempScores;
    const percentages = calculatePercentages();
    
    const modal = document.getElementById('mbti-result-modal');
    if (!modal) return;
    
    const content = document.getElementById('mbti-result-content');
    if (content) {
        content.innerHTML = `
            <div class="mbti-result-card">
                <div class="mbti-result-icon">🧠</div>
                <h2 class="mbti-result-title">Seu tipo de personalidade</h2>
                <div class="mbti-result-type">${type}</div>
                <p class="mbti-result-description">${description}</p>
                
                <div class="mbti-percentages">
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Energia:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.EI.primary} ${percentages.EI.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Informação:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.SN.primary} ${percentages.SN.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Decisão:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.TF.primary} ${percentages.TF.primaryPercent}%
                        </span>
                    </div>
                    <div class="mbti-percentage-item">
                        <span class="mbti-percentage-label">Organização:</span>
                        <span class="mbti-percentage-value">
                            ${percentages.JP.primary} ${percentages.JP.primaryPercent}%
                        </span>
                    </div>
                </div>
                
                <div class="mbti-result-actions">
                    <button class="btn btn-primary btn-full" id="mbti-retake-test">Refazer teste</button>
                    <button class="btn btn-secondary btn-full" id="mbti-close-detail">Fechar</button>
                </div>
            </div>
        `;
        
        // Adicionar event listeners
        const retakeBtn = document.getElementById('mbti-retake-test');
        const closeBtn = document.getElementById('mbti-close-detail');
        
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                openMBTITest();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
    }
    
    modal.classList.remove('hidden');
}

// Função auxiliar para mostrar notificação
function showNotification(message) {
    // Implementar notificação simples
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Exportar funções para uso em main.js
window.openMBTITest = openMBTITest;
window.closeMBTITest = closeMBTITest;
window.showMBTIResultDetail = showMBTIResultDetail;
