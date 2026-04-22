const CACHE='rw-v86';
const STATIC=['./manifest.json','./icon_192.png','./icon_512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // index.html - always fetch fresh from network, never cache
  if(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/randwise')||url.pathname.endsWith('/randwise/')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));
    return;
  }
  // Only GET requests can be cached
  if(e.request.method!=='GET') return;
  // Static assets - cache first
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200&&res.type==='basic'){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      });
    })
  );
});
