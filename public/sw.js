// Deep Tutor Pro service worker (web build only; the Windows and Android
// apps already ship every file). Precaches the whole app on first visit so it
// opens and works offline; the OCR engine is cached the first time it is used.
// API calls to the DeepTutor server are never cached.

const CACHE = 'dtp-app';
const RUNTIME = 'dtp-runtime';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('precache.json', { cache: 'no-store' });
      const { version, files } = await res.json();
      const cache = await caches.open(`${CACHE}-${version}`);
      await cache.addAll(files);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('precache.json', { cache: 'no-store' }).catch(() => null);
      const version = res ? (await res.json()).version : null;
      for (const key of await caches.keys()) {
        if (key.startsWith(`${CACHE}-`) && version && key !== `${CACHE}-${version}`) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    // Network first (3.5 s), so updates arrive; the cached app when offline.
    event.respondWith(
      (async () => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3500);
          const fresh = await fetch(req, { signal: ctrl.signal });
          clearTimeout(timer);
          if (fresh.ok && !fresh.redirected) return fresh;
          throw new Error('bad response');
        } catch {
          return (await caches.match('./', { ignoreSearch: true })) || (await caches.match('index.html', { ignoreSearch: true })) || Response.error();
        }
      })(),
    );
    return;
  }
  // Built files are content-hashed: cache first.
  event.respondWith(
    (async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && (url.pathname.includes('/vendor/') || url.pathname.includes('/assets/'))) {
        const cache = await caches.open(RUNTIME);
        cache.put(req, res.clone());
      }
      return res;
    })(),
  );
});
