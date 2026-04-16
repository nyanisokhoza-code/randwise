const CACHE = 'rw-v39';
const STATIC = [
  '/randwise/',
  '/randwise/index.html',
  '/randwise/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
});

// Activate — delete old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for HTML (always fresh), cache fallback for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch index.html fresh from network — never serve stale app
  if(url.pathname.endsWith('/') || url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Other requests — network first, cache fallback
  // Only cache GET requests — Cache API doesn't support POST/PUT etc.
  if(e.request.method !== 'GET'){
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if(res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Message from app — skip waiting and take control
self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
