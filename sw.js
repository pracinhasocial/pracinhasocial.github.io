const CACHE_NAME = 'pracinha-v5';
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

// Receber push do servidor e exibir notificação
self.addEventListener('push', (event) => {
  let data = { title: 'Pracinha', body: 'Você tem uma nova notificação', icon: '/src/components/logo.webp' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pracinha', body: event.data.text(), icon: '/src/components/logo.webp' };
    }
  }

  const options = {
    body: data.body || 'Nova notificação',
    icon: data.icon || '/src/components/logo.webp',
    badge: '/src/components/logo.webp',
    vibrate: [200, 100, 200],
    tag: data.tag || 'pracinha-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pracinha', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = new URL(
    event.notification.data && event.notification.data.url ? event.notification.data.url : '/',
    self.location.origin
  );

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).origin === url.origin && 'focus' in client) {
            return client.navigate(url.href).then(() => client.focus());
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url.href);
        }
      })
  );
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event.notification.tag);
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
