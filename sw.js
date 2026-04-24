const CACHE='rw-v117';
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

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push',e=>{
  let data={title:'MyRandWise 🌱',body:'You have a new update.',icon:'./icon_192.png',badge:'./icon_192.png',tag:'myrandwise-push',url:'./'};
  try{
    if(e.data) Object.assign(data, e.data.json());
  }catch{}
  e.waitUntil(
    self.registration.showNotification(data.title,{
      body: data.body,
      icon: data.icon||'./icon_192.png',
      badge: data.badge||'./icon_192.png',
      tag: data.tag||'myrandwise-push',
      renotify: true,
      data:{ url: data.url||'./' },
      actions:[
        {action:'open', title:'Open app'},
        {action:'dismiss', title:'Dismiss'}
      ]
    })
  );
});

// Handle notification click — open the app
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  if(e.action==='dismiss') return;
  const url=e.notification.data?.url||'./';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(windowClients=>{
      // If app already open, focus it
      for(const client of windowClients){
        if(client.url.includes('randwise')&&'focus' in client){
          return client.focus();
        }
      }
      // Otherwise open a new window
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});

