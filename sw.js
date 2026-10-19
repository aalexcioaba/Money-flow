// Money Flow: offline cache. Bump VERSION after changing any file.
const VERSION='mf-v37';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];

// Install: always fetch fresh copies (skip the browser's HTTP cache, GitHub Pages caches files ~10 min)
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});

// Activate: drop old caches and take over open pages right away
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const isPage=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isPage){
    // Pages: network first so a new version shows up immediately; cache only when offline
    e.respondWith(fetch(req,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put('index.html',cp))}
      return r;
    }).catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
    return;
  }
  // Everything else: cache first, refresh in the background
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:true});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
