/* SK MOBILES PWA shell cache. Firebase/auth/firestore requests are never intercepted. */
const CACHE_PREFIX = 'sk-mobiles-shell-';
const CACHE_NAME = 'sk-mobiles-shell-v5.11.38';
const APP_SHELL = [
  '/', '/index.html', '/manifest.webmanifest',
  '/css/fonts.css', '/css/style.css', '/css/premium-overrides.css', '/css/used-mobile-stock.css', '/css/billing-page.css', '/css/colorful-ui.css', '/css/polish-v143.css', '/css/invoice-unified.css', '/css/settings-v145.css', '/css/screens-v145.css', '/css/bottom-nav.css', '/css/appearance.css', '/css/fixes.css', '/css/business-tools.css', '/css/shop-tools.css', '/js/features/shop-tools-v151.js', '/fonts/inter-regular.woff', '/fonts/inter-medium.woff', '/fonts/inter-semibold.woff', '/js/features/settings-v145.js', '/js/features/date-fields-v145.js', '/js/features/backup-status.js', '/js/features/scanner-v152.js', '/js/features/qr-mini.js', '/js/features/invoice-upi.js', '/js/features/month-report.js', '/js/features/cloud-guard.js', '/js/features/repair-photos.js', '/js/features/dealer-tracker.js', '/js/features/global-search.js', '/js/features/credit-range.js', '/js/features/exchange.js', '/js/features/repair-ready.js', '/js/features/price-list.js', '/js/features/credit-history.js', '/js/features/used-stock-view.js', '/js/features/back-nav.js', '/js/features/recent-activity.js', '/js/features/customer-merge.js', '/js/features/search-clear.js', '/js/features/tools-common.js', '/js/features/bulk-whatsapp.js', '/js/features/review-requests.js', '/js/features/home-extras.js', '/js/features/no-flicker.js', '/js/features/wa-business.js', '/js/features/pdf-color-fix.js', '/js/features/tap-guard.js', '/js/features/stock-aging.js', '/js/features/backup-reminder.js', '/js/features/date-dmy.js', '/js/features/popup-center.js', '/js/features/clean-pages.js', '/js/features/people.js', '/js/features/install-app.js', '/js/features/receipts.js', '/js/features/ledger-actions.js', '/js/features/remind-ta.js', '/js/features/spring-scroll.js', '/js/features/spring-settings.js', '/js/features/business-tools-v148.js', '/js/features/form-icons-v145.js', '/js/features/colorful-ui.js', '/js/features/pin-security.js', '/js/app.js', '/js/firebase-sync.js',
  '/icons/sk-mobiles-192.png', '/icons/sk-mobiles-512.png', '/icons/sk-mobiles-maskable-192.png', '/icons/sk-mobiles-maskable-512.png',
  '/Logo.png', '/assets/sk-home-logo.png', '/assets/sk-home-hero.jpg',
  '/assets/sk-home-glass.png', '/assets/sk-home-used-inventory.png',
  '/assets/sk-home-stock-box.png', '/assets/sk-home-accessories.png',
  '/assets/sk-home-repair.png', '/assets/sk-home-other-stock.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Require the document and manifest to cache successfully; optional assets may retry later.
    await cache.add(new Request('/index.html', {cache:'reload'}));
    await cache.add(new Request('/manifest.webmanifest', {cache:'reload'}));
    await Promise.all(APP_SHELL.filter(p => p !== '/index.html' && p !== '/manifest.webmanifest').map(async path => {
      try {
        const response = await fetch(new Request(path, {cache:'reload'}));
        if (response.ok) await cache.put(path, response);
      } catch (_) { /* network may be temporarily unavailable */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          if (url.pathname === '/' || url.pathname === '/index.html') await cache.put('/index.html', response.clone()).catch(() => {});
          return response;
        }
        // Hosting errors should not strand the installed app when a known-good shell exists.
        const fallback = await caches.match('/index.html');
        return fallback || response;
      } catch (_) {
        return (await caches.match('/index.html')) || new Response('SK MOBILES could not load. Check your connection and reopen the app.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  if (/\.(?:css|js|webmanifest|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, response.clone()).catch(() => {});
          return response;
        }
        const fallback = await caches.match(req, {ignoreSearch:true});
        return fallback || response;
      } catch (_) {
        return (await caches.match(req, {ignoreSearch:true})) || new Response('SK MOBILES resource unavailable. Reconnect and reopen the app.', {status:504, headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
  }
});
