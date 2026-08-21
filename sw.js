const CACHE_NAME = 'pracinha-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/main.css',
  '/src/js/main.js',
  '/src/js/supabase-client.js',
  '/src/components/header.js',
  '/src/components/logo.webp'
];

// Instalação do service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação do service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch de recursos - Network First para HTML/JS/CSS, Cache First para imagens
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não cachear requisições não-GET (POST, PATCH, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Não cachear requisições de esquemas não suportados (chrome-extension, etc.)
  if (!url.protocol.startsWith('http:') && !url.protocol.startsWith('https:')) {
    return;
  }

  // Não cachear requisições para o Supabase (API)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Para arquivos HTML, JS e CSS, usar network-first
  if (url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone da resposta para cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Se falhar, tentar do cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para outros recursos (imagens), usar cache-first
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
    );
  }
});
