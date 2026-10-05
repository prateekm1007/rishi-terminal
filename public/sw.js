/*
 * X3-09 (Round 15 B7): the Rishi Terminal service worker.
 *
 * Contract (roadmap acceptance, verbatim): "service worker caching the
 * app shell only (never API data), offline page".
 *
 *   - /api/** is NEVER intercepted and NEVER cached: requests fall
 *     through to the network (a cached price or score would be a
 *     provenance violation — Constitution 3/4). The Playwright
 *     acceptance asserts both the pass-through and the empty cache.
 *   - Navigations are NETWORK-FIRST: online users always get fresh ISR
 *     HTML; when the network fails, the precached /offline page is
 *     served (X3-09's offline page).
 *   - Static assets (/_next/static/**, /icons/**) are CACHE-FIRST:
 *     they are content-hashed or immutable by construction.
 *
 * No framework dependency — a plain, auditable ~90 lines.
 */

const CACHE = 'rishi-shell-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only same-origin. And NEVER touch the API — market data and scores
  // must come from the network or fail honestly (never a stale cache).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Static shell assets: cache-first (immutable by construction).
  if (isStaticAsset(url) && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: network-first, offline fallback to the precached page.
  // `cache: 'no-store'` matters: without it the browser's HTTP cache can
  // satisfy a repeated navigation "offline" with a heuristically-stale
  // page instead of the honest offline screen (observed in the
  // Playwright acceptance). Network-first means really asking the
  // network.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        caches.match(OFFLINE_URL).then((page) => page || Response.error()),
      ),
    );
  }
});
