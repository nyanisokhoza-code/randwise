// RandWise Service Worker v2026-04-14
const CACHE = 'rw-2026-04-14';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.hostname.includes('github.io') && !url.hostname.includes('localhost')) return;

  // HTML — always network, never cache
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets — network first, cache fallback (safe clone handling)
  e.respondWith(
    fetch(e.request, {cache: 'no-cache'})
      .then(res => {
        if (res.ok) {
          const toCache = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
