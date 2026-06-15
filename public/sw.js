const CACHE = 'vibraalto-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put('/', c)); return res; }).catch(() => caches.match('/').then(r => r || caches.match('/index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok && /fonts|cdnjs|three/.test(req.url)) { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
    return res;
  }).catch(() => cached)));
});
