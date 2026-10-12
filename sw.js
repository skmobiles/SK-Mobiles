/* SK MOBILES PWA shell cache. Firebase/auth/firestore requests are never intercepted. */
const CACHE_NAME = 'sk-mobiles-shell-v1';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/style.css', './js/app.js', './js/firebase-sync.js',
  './icons/sk-mobiles-192.png', './icons/sk-mobiles-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try { await cache.add(new Request(path, {cache:'reload'})); } catch (_) { /* optional asset; online load can retry */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('sk-mobiles-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never intercept Firebase, Google APIs, CDN dependencies, or other cross-origin traffic.
  if (url.origin !== self.location.origin) return;
  // Keep navigation fresh, but allow the last successfully cached app shell to open offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await caches.match(req)) || (await caches.match('./index.html')) || new Response('SK MOBILES is offline. Connect to the internet and reopen the app.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }
  // Network-first for app files so deployments update; cached copies are fallback only.
  if (/\.(?:css|js|webmanifest|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, response.clone()).catch(() => {});
        }
        return response;
      } catch (_) {
        return (await caches.match(req)) || new Response('', {status:504});
      }
    })());
  }
});
