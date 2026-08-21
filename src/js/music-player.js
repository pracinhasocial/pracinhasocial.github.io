// JavaScript do Player de Música (SoundCloud + MP3 Hotlinks + YouTube)

// Estado do player
let soundCloudWidget = null;
let html5Audio = null;
let youtubePlayer = null;
let isPlaying = false;
let userMusicData = null;
let currentSource = null; // 'soundcloud' | 'html5' | 'youtube'
let currentPlayerId = 'music-player-card';
let scSounds = []; // Armazenar faixas do SoundCloud para shuffle
let currentYouTubeUrl = null;

// Estado do player HTML5 (MP3)
let html5Playlist = [];
let html5CurrentIndex = 0;
let html5ShuffleMode = false;
let html5PlayedIndices = [];
let html5ShuffleQueue = [];

// Estado do player SoundCloud
let scShuffleMode = false;
let scPlayedIndices = [];
let scShuffleQueue = [];
let scCurrentIndex = 0;

// Extrair URLs separadas por vírgula e limpar
function parseUrls(input) {
    if (!input) return [];
    return input.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5); // Limita a 5 links
}

// Detectar fonte da URL
function detectMusicSource(urlStr) {
    const urls = parseUrls(urlStr);
    if (urls.length === 0) return null;
    
    // Se a primeira URL for do YouTube, consideramos como YouTube
    if (/youtube\.com|youtu\.be/.test(urls[0])) return 'youtube';
    
    // Se a primeira URL for do SoundCloud, consideramos como SoundCloud
    if (/soundcloud\.com/.test(urls[0])) return 'soundcloud';
    
    // Caso contrário, tratamos como hotlinks de áudio HTML5
    return 'html5';
}

// Extrair nome do arquivo para título da música (MP3)
function extractFilename(url) {
    try {
        const pathname = new URL(url).pathname;
        let filename = pathname.split('/').pop();
        filename = decodeURIComponent(filename);
        // Remover extensão
        filename = filename.replace(/\.[^/.]+$/, "");
        return filename || 'Música Desconhecida';
    } catch(e) {
        return 'Música';
    }
}

// Extrair ID do YouTube de uma URL
function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Extrair ID de playlist do YouTube de uma URL
function extractYouTubePlaylistId(url) {
    const playlistRegex = /[?&]list=([^&]+)/;
    const match = url.match(playlistRegex);
    return match ? match[1] : null;
}

// Inicializar player de música
function initMusicPlayer() {
    // Controles do player principal
    const btnPlay = document.getElementById('btn-play');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnVolume = document.getElementById('btn-volume');
    const volumeSlider = document.getElementById('volume-slider');
    const btnEditMusic = document.getElementById('btn-edit-music');

    if (btnPlay) btnPlay.addEventListener('click', togglePlay);
    if (btnPrev) btnPrev.addEventListener('click', playPrev);
    if (btnNext) btnNext.addEventListener('click', playNext);
    if (btnShuffle) btnShuffle.addEventListener('click', toggleShuffle);
    if (btnVolume) btnVolume.addEventListener('click', toggleMute);
    if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);
    if (btnEditMusic) btnEditMusic.addEventListener('click', openMusicConfigModal);

    // Controles do player do perfil público
    const publicBtnPlay = document.getElementById('public-profile-btn-play');
    const publicBtnPrev = document.getElementById('public-profile-btn-prev');
    const publicBtnNext = document.getElementById('public-profile-btn-next');
    const publicBtnVolume = document.getElementById('public-profile-btn-volume');
    const publicVolumeSlider = document.getElementById('public-profile-volume-slider');

    if (publicBtnPlay) publicBtnPlay.addEventListener('click', togglePlay);
    if (publicBtnPrev) publicBtnPrev.addEventListener('click', playPrev);
    if (publicBtnNext) publicBtnNext.addEventListener('click', playNext);
    if (publicBtnVolume) publicBtnVolume.addEventListener('click', toggleMute);
    if (publicVolumeSlider) publicVolumeSlider.addEventListener('input', handleVolumeChange);

    // Controles do player do cantinho
    const cantinhoBtnPlay = document.getElementById('cantinho-btn-play');
    const cantinhoBtnPrev = document.getElementById('cantinho-btn-prev');
    const cantinhoBtnNext = document.getElementById('cantinho-btn-next');
    const cantinhoBtnShuffle = document.getElementById('cantinho-btn-shuffle');
    const cantinhoBtnVolume = document.getElementById('cantinho-btn-volume');
    const cantinhoVolumeSlider = document.getElementById('cantinho-volume-slider');

    if (cantinhoBtnPlay) cantinhoBtnPlay.addEventListener('click', togglePlay);
    if (cantinhoBtnPrev) cantinhoBtnPrev.addEventListener('click', playPrev);
    if (cantinhoBtnNext) cantinhoBtnNext.addEventListener('click', playNext);
    if (cantinhoBtnShuffle) {
        cantinhoBtnShuffle.addEventListener('click', toggleShuffle);
    }
    if (cantinhoBtnVolume) cantinhoBtnVolume.addEventListener('click', toggleMute);
    if (cantinhoVolumeSlider) cantinhoVolumeSlider.addEventListener('input', handleVolumeChange);

    // Inicializar YouTube player floated (iframe simples)
    initYouTubePlayerFloated();
}

// Carregar música de um perfil específico
async function loadProfileMusic(profile, playerId = 'music-player-card') {
    const urlStr = profile?.soundcloud_url;
    const playerCard = document.getElementById(playerId);

    if (!urlStr) {
        if (playerCard) playerCard.classList.add('hidden');
        return;
    }

    const source = detectMusicSource(urlStr);
    if (!source) {
        if (playerCard) playerCard.classList.add('hidden');
        hideYouTubePlayer();
        return;
    }

    // Se for YouTube, usar o player floated em vez do player card
    if (source === 'youtube') {
        initYouTubePlayer(urlStr);
        if (playerCard) playerCard.classList.add('hidden');
        return;
    }

    // Se não for YouTube, esconder o player floated
    hideYouTubePlayer();

    currentSource = source;
    currentPlayerId = playerId;
    showMusicPlayer({ soundcloud_url: urlStr, original_url: parseUrls(urlStr)[0] }, playerId);
}

// Carregar música do usuário logado
async function loadUserMusic() {
    if (typeof currentProfile !== 'undefined' && currentProfile?.soundcloud_url) {
        await loadProfileMusic(currentProfile, 'music-player-card');
    }
}

// Mostrar o player
function showMusicPlayer(musicData, playerId = 'music-player-card') {
    const playerCard = document.getElementById(playerId);
    if (!playerCard) {
        return;
    }

    playerCard.classList.remove('hidden');

    // Mapear IDs baseados no playerId
    let idPrefix = '';
    if (playerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (playerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const musicTitle = document.getElementById(`${idPrefix}music-title`);
    const musicArtist = document.getElementById(`${idPrefix}music-artist`);
    const musicTitleLink = document.getElementById(`${idPrefix}music-title-link`);

    if (musicTitle) musicTitle.textContent = 'Carregando...';
    if (musicArtist) musicArtist.textContent = '';
    if (musicTitleLink) musicTitleLink.href = musicData.original_url || '#';

    const source = detectMusicSource(musicData.soundcloud_url);

    if (source === 'youtube') {
        initYouTubePlayer(parseUrls(musicData.soundcloud_url)[0]);
    } else if (source === 'soundcloud') {
        initSoundCloudWidget(parseUrls(musicData.soundcloud_url)[0], playerId);
    } else if (source === 'html5') {
        initHTML5Player(parseUrls(musicData.soundcloud_url), playerId);
    }
}

// ─── HTML5 AUDIO (MP3/OGG Hotlinks) ───────────────────────────────────────────

function initHTML5Player(urls, playerId) {
    if (html5Audio) {
        html5Audio.pause();
        html5Audio.remove();
        html5Audio = null;
    }
    
    html5Playlist = urls;
    html5CurrentIndex = 0;
    html5ShuffleMode = false;
    html5PlayedIndices = [];
    html5ShuffleQueue = [];
    isPlaying = false;
    updatePlayButton();

    // Mapear IDs baseados no playerId
    let idPrefix = '';
    if (playerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (playerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const btnPrev = document.getElementById(`${idPrefix}btn-prev`);
    const btnNext = document.getElementById(`${idPrefix}btn-next`);
    const btnShuffle = document.getElementById(`${idPrefix}btn-shuffle`);
    
    if (html5Playlist.length > 1) {
        if (btnPrev) btnPrev.style.display = '';
        if (btnNext) btnNext.style.display = '';
        if (btnShuffle) btnShuffle.classList.remove('hidden');
    } else {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        if (btnShuffle) btnShuffle.classList.add('hidden');
    }

    html5Audio = new Audio();
    html5Audio.crossOrigin = 'anonymous'; // Tenta permitir CORS se disponível
    
    html5Audio.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayButton();
        if (html5Playlist.length > 1) {
            playNextHTML5();
        }
    });

    html5Audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
    });

    html5Audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
    });

    // Definir volume inicial
    let volumeSliderId = 'volume-slider';
    if (playerId === 'public-profile-music-player-card') {
        volumeSliderId = 'public-profile-volume-slider';
    } else if (playerId === 'cantinho-music-player-card') {
        volumeSliderId = 'cantinho-volume-slider';
    }
    const volumeSlider = document.getElementById(volumeSliderId);
    if (volumeSlider) {
        html5Audio.volume = Number(volumeSlider.value);
    }

    loadHTML5Track(0);
}

function loadHTML5Track(index) {
    if (!html5Audio || html5Playlist.length === 0) return;
    
    if (index < 0 || index >= html5Playlist.length) {
        index = 0;
    }
    
    html5CurrentIndex = index;
    const url = html5Playlist[html5CurrentIndex];
    html5Audio.src = url;
    html5Audio.load();
    
    updateHTML5PlayerInfo();
}

function updateHTML5PlayerInfo() {
    let idPrefix = '';
    if (currentPlayerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (currentPlayerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const musicTitle = document.getElementById(`${idPrefix}music-title`);
    const musicArtist = document.getElementById(`${idPrefix}music-artist`);
    const musicTitleLink = document.getElementById(`${idPrefix}music-title-link`);
    const musicTooltip = document.getElementById(`${idPrefix}music-tooltip`);
    const tooltipText = musicTooltip?.querySelector('.comic-tooltip-text');

    const songName = extractFilename(html5Playlist[html5CurrentIndex]);

    if (musicTitle) {
        musicTitle.textContent = songName;
    }
    if (musicArtist) {
        musicArtist.textContent = '';
    }
    if (musicTitleLink) {
        musicTitleLink.href = html5Playlist[html5CurrentIndex];
    }
    if (tooltipText) {
        tooltipText.textContent = songName;
    }
}

function playNextHTML5() {
    if (!html5Audio || html5Playlist.length === 0) return;
    
    let nextIndex;
    
    if (html5ShuffleMode) {
        // Modo shuffle: pegar próximo da fila ou criar nova fila
        if (html5ShuffleQueue.length === 0) {
            // Criar nova fila com todos os índices que não foram tocados
            const availableIndices = [];
            for (let i = 0; i < html5Playlist.length; i++) {
                if (!html5PlayedIndices.includes(i)) {
                    availableIndices.push(i);
                }
            }
            
            // Se todos foram tocados, resetar e criar nova fila completa
            if (availableIndices.length === 0) {
                html5PlayedIndices = [];
                for (let i = 0; i < html5Playlist.length; i++) {
                    availableIndices.push(i);
                }
            }
            
            // Embaralhar a fila
            html5ShuffleQueue = shuffleArray(availableIndices);
        }
        
        nextIndex = html5ShuffleQueue.shift();
        html5PlayedIndices.push(nextIndex);
    } else {
        // Modo sequencial
        nextIndex = html5CurrentIndex + 1;
        if (nextIndex >= html5Playlist.length) {
            nextIndex = 0; // Voltar para o início
        }
    }
    
    loadHTML5Track(nextIndex);
    html5Audio.play().catch(e => console.warn('Autoplay bloqueado', e));
}

function toggleShuffle() {

    // Atualizar visual do botão primeiro (independente da fonte)
    let idPrefix = '';
    if (currentPlayerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (currentPlayerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const btnShuffle = document.getElementById(`${idPrefix}btn-shuffle`);

    if (!btnShuffle) {
        console.error('Botão shuffle não encontrado!');
        return;
    }

    // Toggle visual state
    const isActive = btnShuffle.classList.contains('shuffle-active');
    btnShuffle.classList.toggle('shuffle-active', !isActive);

    // Implementar lógica de shuffle baseado na fonte
    if (currentSource === 'html5' && html5Playlist.length > 1) {
        html5ShuffleMode = !html5ShuffleMode;

        if (html5ShuffleMode) {
            html5PlayedIndices = [html5CurrentIndex];
            html5ShuffleQueue = [];
        } else {
            html5PlayedIndices = [];
            html5ShuffleQueue = [];
        }
    } else if (currentSource === 'soundcloud' && scSounds.length > 1) {
        scShuffleMode = !scShuffleMode;

        if (scShuffleMode) {
            scPlayedIndices = [scCurrentIndex];
            scShuffleQueue = [];
        } else {
            scPlayedIndices = [];
            scShuffleQueue = [];
        }
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ─── SOUNDCLOUD ───────────────────────────────────────────────────────────────

function initSoundCloudWidget(soundcloudUrl, playerId = 'music-player-card') {
    const existingWidget = document.getElementById(`soundcloud-widget-${playerId}`);
    if (existingWidget) existingWidget.remove();

    const iframe = document.createElement('iframe');
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&auto_play=false&show_artwork=true`;
    iframe.width = '100%';
    iframe.height = '166';
    iframe.style.display = 'none';
    iframe.id = `soundcloud-widget-${playerId}`;
    iframe.allow = 'encrypted-media; autoplay';
    document.body.appendChild(iframe);

    iframe.onload = () => {
        soundCloudWidget = SC.Widget(iframe);
        soundCloudWidget.bind(SC.Widget.Events.READY, () => {
            soundCloudWidget.getSounds((sounds) => {
                scSounds = sounds || [];
                
                // Mapear IDs baseados no playerId
                let idPrefix = '';
                if (playerId === 'public-profile-music-player-card') {
                    idPrefix = 'public-profile-';
                } else if (playerId === 'cantinho-music-player-card') {
                    idPrefix = 'cantinho-';
                }
                // music-player-card usa prefixo vazio
                
                const btnPrev = document.getElementById(`${idPrefix}btn-prev`);
                const btnNext = document.getElementById(`${idPrefix}btn-next`);
                const btnShuffle = document.getElementById(`${idPrefix}btn-shuffle`);
                
                if (scSounds.length > 1) {
                    if (btnPrev) btnPrev.style.display = '';
                    if (btnNext) btnNext.style.display = '';
                    if (btnShuffle) btnShuffle.classList.remove('hidden');
                } else {
                    if (btnPrev) btnPrev.style.display = 'none';
                    if (btnNext) btnNext.style.display = 'none';
                    if (btnShuffle) btnShuffle.classList.add('hidden');
                }
            });
            updateSCPlayerInfo();
        });
        soundCloudWidget.bind(SC.Widget.Events.PLAY, () => {
            isPlaying = true;
            updatePlayButton();
            updateSCPlayerInfo();
        });
        soundCloudWidget.bind(SC.Widget.Events.PAUSE, () => { isPlaying = false; updatePlayButton(); });
        soundCloudWidget.bind(SC.Widget.Events.FINISH, () => {
            isPlaying = false;
            updatePlayButton();
            if (scSounds && scSounds.length > 1) {
                playNextSC();
            }
        });
    };
}

function updateSCPlayerInfo() {
    if (!soundCloudWidget) return;
    soundCloudWidget.getCurrentSound((sound) => {
        let idPrefix = '';
        if (currentPlayerId === 'public-profile-music-player-card') {
            idPrefix = 'public-profile-';
        } else if (currentPlayerId === 'cantinho-music-player-card') {
            idPrefix = 'cantinho-';
        }
        // music-player-card usa prefixo vazio

        const musicTitle = document.getElementById(`${idPrefix}music-title`);
        const musicArtist = document.getElementById(`${idPrefix}music-artist`);
        const musicTooltip = document.getElementById(`${idPrefix}music-tooltip`);
        const tooltipText = musicTooltip?.querySelector('.comic-tooltip-text');

        const songName = sound?.title || 'Música';

        // Atualizar o índice atual baseado no ID da música
        if (sound && scSounds.length > 0) {
            const currentIndex = scSounds.findIndex(s => s.id === sound.id);
            if (currentIndex !== -1) {
                scCurrentIndex = currentIndex;
            }
        }

        if (musicTitle) musicTitle.textContent = songName;
        if (musicArtist) musicArtist.textContent = '';
        if (tooltipText) tooltipText.textContent = songName;
    });
}

// ─── CONTROLES COMPARTILHADOS ─────────────────────────────────────────────────

function togglePlay() {
    if (currentSource === 'youtube') {
        if (!youtubePlayer) return;
        if (isPlaying) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    } else if (currentSource === 'html5') {
        if (!html5Audio) return;
        if (isPlaying) {
            html5Audio.pause();
        } else {
            html5Audio.play().catch(e => console.warn('Playback error:', e));
        }
    } else if (currentSource === 'soundcloud') {
        if (!soundCloudWidget) return;
        try {
            if (isPlaying) { soundCloudWidget.pause(); } else { soundCloudWidget.play(); }
        } catch (err) { console.error('togglePlay SC error:', err); }
    }
}

function playNextSC() {
    if (!soundCloudWidget || !scSounds || scSounds.length === 0) return;

    if (scShuffleMode && scSounds.length > 1) {
        // Lógica de shuffle para SoundCloud
        if (scShuffleQueue.length === 0) {
            // Se a fila está vazia, criar uma nova fila com índices não tocados
            const availableIndices = [];
            for (let i = 0; i < scSounds.length; i++) {
                if (!scPlayedIndices.includes(i)) {
                    availableIndices.push(i);
                }
            }

            if (availableIndices.length === 0) {
                // Todos foram tocados, resetar e começar de novo
                scPlayedIndices = [];
                scShuffleQueue = shuffleArray([...Array(scSounds.length).keys()]);
            } else {
                scShuffleQueue = shuffleArray(availableIndices);
            }
        }

        // Pegar o próximo da fila
        const nextIndex = scShuffleQueue.shift();
        scPlayedIndices.push(nextIndex);
        scCurrentIndex = nextIndex;

        // Tocar o índice específico no SoundCloud
        soundCloudWidget.skip(nextIndex);
        soundCloudWidget.play();
    } else {
        // Modo normal
        soundCloudWidget.next();
        soundCloudWidget.play();
    }
}

function playPrev() {
    if (currentSource === 'youtube' && youtubePlayer) {
        youtubePlayer.previousVideo();
    } else if (currentSource === 'html5') {
        let prevIndex = html5CurrentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = html5Playlist.length - 1; // Voltar para o final
        }
        loadHTML5Track(prevIndex);
    } else if (currentSource === 'soundcloud' && soundCloudWidget) {
        soundCloudWidget.prev();
    }
}

function playNext() {
    if (currentSource === 'youtube' && youtubePlayer) {
        youtubePlayer.nextVideo();
    } else if (currentSource === 'html5') {
        if (html5Playlist.length > 1) {
            playNextHTML5();
        } else if (html5Audio) {
            html5Audio.currentTime = 0;
            html5Audio.play().catch(e => console.warn(e));
        }
    } else if (currentSource === 'soundcloud' && soundCloudWidget) {
        playNextSC();
    }
}

function toggleMute() {
    const volumeIcon = document.getElementById('volume-icon');
    const muteIcon = document.getElementById('mute-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const isMuted = volumeIcon?.classList.contains('hidden');
    const vol = volumeSlider ? Number(volumeSlider.value) : 1;

    if (currentSource === 'html5') {
        if (html5Audio) {
            html5Audio.muted = !isMuted; // Se isMuted=true (agora mudo), queremos desmutar
        }
    } else if (currentSource === 'soundcloud' && soundCloudWidget) {
        soundCloudWidget.setVolume(isMuted ? (vol * 100) : 0);
    }

    if (volumeIcon && muteIcon) {
        volumeIcon.classList.toggle('hidden', !isMuted);
        muteIcon.classList.toggle('hidden', isMuted);
    }
}

function handleVolumeChange(e) {
    const volume = Number(e.target.value);

    if (currentSource === 'html5') {
        if (html5Audio) {
            html5Audio.volume = volume;
            html5Audio.muted = volume === 0;
        }
    } else if (currentSource === 'soundcloud' && soundCloudWidget) {
        soundCloudWidget.setVolume(volume * 100);
    }

    // Atualizar ícones de volume para o player atual
    let idPrefix = '';
    if (currentPlayerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (currentPlayerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const volumeIcon = document.getElementById(`${idPrefix}volume-icon`);
    const muteIcon = document.getElementById(`${idPrefix}mute-icon`);
    if (volumeIcon && muteIcon) {
        volumeIcon.classList.toggle('hidden', volume === 0);
        muteIcon.classList.toggle('hidden', volume !== 0);
    }
}

function updatePlayButton() {
    // Atualizar ícones de play/pause para o player atual
    let idPrefix = '';
    if (currentPlayerId === 'public-profile-music-player-card') {
        idPrefix = 'public-profile-';
    } else if (currentPlayerId === 'cantinho-music-player-card') {
        idPrefix = 'cantinho-';
    }
    // music-player-card usa prefixo vazio

    const playIcon = document.getElementById(`${idPrefix}play-icon`);
    const pauseIcon = document.getElementById(`${idPrefix}pause-icon`);
    if (playIcon && pauseIcon) {
        playIcon.classList.toggle('hidden', isPlaying);
        pauseIcon.classList.toggle('hidden', !isPlaying);
    }
}

function openMusicConfigModal() {
    window.location.hash = '#settings';
}

// ─── YOUTUBE PLAYER FLOATED (IFrame Simples) ───────────────────────────────────

function initYouTubePlayerFloated() {
    const btnToggle = document.getElementById('youtube-player-toggle');
    const btnClose = document.getElementById('youtube-player-close');

    if (btnToggle) {
        btnToggle.addEventListener('click', toggleYouTubePlayer);
    }
    if (btnClose) {
        btnClose.addEventListener('click', closeYouTubePlayer);
    }
}

function initYouTubePlayer(url) {
    const videoId = extractYouTubeId(url);
    const playlistId = extractYouTubePlaylistId(url);
    
    if (!videoId && !playlistId) {
        console.error('URL do YouTube inválida:', url);
        return;
    }
    
    

    currentYouTubeUrl = url;
    currentSource = 'youtube';

    const floatedPlayer = document.getElementById('youtube-player-floated');
    const container = document.getElementById('youtube-iframe-container');
    const titleElement = document.getElementById('youtube-player-title');
    const toggleButton = document.getElementById('youtube-player-toggle');
    
    if (!floatedPlayer || !container) return;

    // Mostrar o botão (sempre visível)
    floatedPlayer.classList.remove('hidden');

    // Voltar ao iframe simples sem autoplay
    let embedUrl;
    if (playlistId) {
        embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
        titleElement.textContent = 'Playlist YouTube';
    } else {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        titleElement.textContent = 'YouTube';
    }

    container.innerHTML = `<iframe 
        src="${embedUrl}" 
        width="320" 
        height="180" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
    </iframe>`;

    // Mostrar título no botão
    toggleButton.classList.add('has-title');

    // Expandir o player
    floatedPlayer.classList.remove('collapsed');
}

function toggleYouTubePlayer() {
    const floatedPlayer = document.getElementById('youtube-player-floated');
    if (!floatedPlayer) return;

    // Toggle entre expandido e colapsado
    floatedPlayer.classList.toggle('collapsed');
}

function closeYouTubePlayer() {
    const floatedPlayer = document.getElementById('youtube-player-floated');
    
    if (!floatedPlayer) return;

    // Colapsar (não fechar de verdade, não parar o vídeo)
    floatedPlayer.classList.add('collapsed');
}

function hideYouTubePlayer() {
    const floatedPlayer = document.getElementById('youtube-player-floated');
    
    if (!floatedPlayer) return;

    // Esconder completamente o player floated
    floatedPlayer.classList.add('hidden');
    
    // Limpar o iframe
    const container = document.getElementById('youtube-iframe-container');
    if (container) {
        container.innerHTML = '';
    }
    
    // Remover classe has-title do botão
    const toggleButton = document.getElementById('youtube-player-toggle');
    if (toggleButton) {
        toggleButton.classList.remove('has-title');
    }
}

export { initMusicPlayer, loadUserMusic, loadProfileMusic, initYouTubePlayer, hideYouTubePlayer };
