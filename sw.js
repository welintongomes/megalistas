const CACHE = 'listflow-v2';

// Tudo que o app precisa para funcionar offline
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjTalFqAqK.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2',
];

// ── Install: guarda os assets no cache ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Tenta cachear cada asset individualmente
      // para não quebrar tudo se um falhar (ex: fonte específica)
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Não cacheou:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => { console.log('[SW] Deletando cache antigo:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve do cache, cai na rede se não tiver ──
self.addEventListener('fetch', e => {
  // Ignora requests não GET e chrome-extension
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      // Não está no cache — busca na rede e guarda para depois
      return fetch(e.request).then(response => {
        // Só cacheia responses válidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // Offline e não tem cache — retorna página principal como fallback
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Mensagem para forçar update ──
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});