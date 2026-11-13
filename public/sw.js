/// <reference lib="webworker" />

/**
 * Service Worker for Vision IT Computer Institute & Vision Learn LMS (vision-admin)
 * Production-grade offline-first implementation complying with:
 * - Next.js 16 App Router & Turbopack
 * - Cache-First navigation strategy
 * - React Server Component (RSC) Stale-While-Revalidate with body clone safety
 * - Web Push & Notification click deep linking
 */

const SW_VERSION = 'vision-pwa-v1.0.1';
const PRECACHE_NAME = `precache-${SW_VERSION}`;
const RUNTIME_NAME = `runtime-${SW_VERSION}`;
const RSC_CACHE_NAME = `rsc-${SW_VERSION}`;

const CRITICAL_PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.webmanifest',
  '/icon.png',
];

/**
 * Helper to normalize Next.js App Router RSC URLs by stripping the _rsc cache buster param.
 * @param {string} urlStr
 * @param {string} [base=self.location.origin]
 * @returns {string}
 */
function getNormalizedRscUrl(urlStr, base = self.location.origin) {
  const parsed = new URL(urlStr, base);
  parsed.searchParams.delete('_rsc');
  return parsed.pathname + (parsed.search ? parsed.search : '');
}

/**
 * Self-Contained Background Freshness Engine: revalidateAndCompare
 *
 * Fetches the latest version of a resource from network, acquires its text body,
 * and compares it byte-for-byte against the cached response text body (obtained via
 * cachedTextPromise BEFORE respondWith stream locking).
 *
 * If content differs:
 *  1. Updates Cache Storage with fresh network response.
 *  2. Dispatches a CONTENT_UPDATED postMessage to all active clients.
 *
 * @param {Request|string} request - The request object or URL to revalidate
 * @param {Promise<string>} cachedTextPromise - Synchronously acquired clone.text() promise from cache
 * @param {string} cacheName - Target Cache Storage bucket name (PRECACHE_NAME or RSC_CACHE_NAME)
 * @param {Request|string} [key=request] - Optional normalized cache key
 */
async function revalidateAndCompare(request, cachedTextPromise, cacheName, key = request) {
  try {
    const networkResponse = await fetch(request);
    if (!networkResponse || !networkResponse.ok) {
      return;
    }

    // Clone network response before consuming text stream
    const networkClone = networkResponse.clone();

    // Await both cached text promise and network text body concurrently
    const [cachedText, networkText] = await Promise.all([
      cachedTextPromise,
      networkClone.text(),
    ]);

    // Perform exact byte comparison
    if (cachedText !== networkText) {
      // 1. Update Cache Storage with fresh network response
      const cache = await caches.open(cacheName);
      await cache.put(key, networkResponse);

      // 2. Broadcast CONTENT_UPDATED message to all active clients
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const targetUrl =
        typeof key === 'string'
          ? key
          : key.url || (typeof request === 'string' ? request : request.url) || '';

      for (const client of clients) {
        client.postMessage({
          type: 'CONTENT_UPDATED',
          url: targetUrl,
          cacheName,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    // Network errors during background revalidation (e.g., offline or dropped packets)
    // are non-fatal and expected in rural deployment; suppress gracefully.
  }
}

/* ==========================================================================
   Lifecycle Events: Install & Activate
   ========================================================================== */

self.addEventListener('install', (event) => {
  // Force immediate activation
  self.skipWaiting();

  event.waitUntil(
    caches.open(PRECACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(CRITICAL_PRECACHE_URLS);
      } catch (err) {
        console.warn('[PWA SW] Precache addAll partially failed; warming individually:', err);
        await Promise.all(
          CRITICAL_PRECACHE_URLS.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res && res.ok) {
                await cache.put(url, res);
              }
            } catch (e) {
              // Ignore failure for missing assets during cold setup/dev
            }
          })
        );
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Claim all uncontrolled tabs immediately
      self.clients.claim(),

      // Purge outdated cache buckets
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('precache-') ||
                name.startsWith('runtime-') ||
                name.startsWith('rsc-')
            )
            .filter((name) => !name.includes(SW_VERSION))
            .map((staleName) => {
              console.log(`[PWA SW] Purging stale cache: ${staleName}`);
              return caches.delete(staleName);
            })
        )
      ),
    ])
  );
});

/* ==========================================================================
   Fetch Interceptor
   ========================================================================== */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Skip non-HTTP(S) schemes (e.g. chrome-extension://, moz-extension://)
  const url = new URL(request.url, self.location.origin);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Skip Chrome extensions, Supabase Auth / REST endpoints, and internal auth routes
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.startsWith('/api/auth')
  ) {
    return;
  }

  // 4. Skip development endpoints, Turbopack, and HMR
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/static/development') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 5. In local development (localhost / 127.0.0.1), bypass all fetch interception
  // to avoid Turbopack HMR and RSC Flight chunk collisions
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return;
  }

  // 6. Navigations (request.mode === 'navigate' or HTML accept header): Cache-First
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PRECACHE_NAME);
        const cachedResponse = (await cache.match(request)) || (await cache.match(url.pathname));

        if (cachedResponse) {
          // Synchronously acquire clone text promise before stream is locked by respondWith
          const cachedClone = cachedResponse.clone();
          const cachedTextPromise = cachedClone.text();

          // Background freshness revalidation without blocking navigation
          event.waitUntil(revalidateAndCompare(request, cachedTextPromise, PRECACHE_NAME));
          return cachedResponse;
        }

        // Cold launch without cache: attempt network
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Network offline & cache miss: return dedicated offline screen
          const offlinePage = (await cache.match('/offline')) || (await caches.match('/offline'));
          return (
            offlinePage ||
            new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - Vision IT</title></head><body style="font-family:sans-serif;background:#020617;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>Vision IT Institute</h1><p>You are currently offline. Please check your network connection.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          );
        }
      })()
    );
    return;
  }

  // 7. App Router RSC requests (has _rsc search param or RSC: 1 header): Network-First with Offline Fallback
  const isRscRequest = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';
  if (isRscRequest) {
    event.respondWith(
      (async () => {
        const normalizedKey = getNormalizedRscUrl(request.url);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(RSC_CACHE_NAME);
            cache.put(normalizedKey, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and un-cached:
          const cache = await caches.open(RSC_CACHE_NAME);
          const cachedRsc = await cache.match(normalizedKey);
          if (cachedRsc) {
            return cachedRsc;
          }

          // Fallback to offline RSC stream if pre-warmed
          const offlineRsc = await cache.match(getNormalizedRscUrl('/offline'));
          if (offlineRsc) {
            return offlineRsc;
          }

          // Return HTTP 503 so Next.js client router falls back to document navigation (/offline)
          return new Response(null, {
            status: 503,
            statusText: 'Offline',
            headers: {
              'Content-Type': 'text/x-component; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        }
      })()
    );
    return;
  }

  // 6. Static assets (Next.js hashed chunks, icons, fonts, images): Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/i.test(url.pathname) ||
    url.hostname.includes('cloudinary.com');

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        // Check precache or runtime cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const cache = await caches.open(RUNTIME_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return new Response('Asset unavailable offline', {
            status: 504,
            statusText: 'Gateway Timeout',
          });
        }
      })()
    );
    return;
  }
});

/* ==========================================================================
   Push & Notification Events
   ========================================================================== */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Vision IT Institute',
    body: 'New update from institute administration.',
    url: '/dashboard',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body || 'New update from institute administration.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    data: {
      url: payload.url || '/dashboard',
    },
    vibrate: [150, 50, 150],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Vision IT Institute', notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetPath = event.notification.data?.url || '/dashboard';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open at the target URL, focus it
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If an app window is open at any URL, navigate and focus
        if (clientList.length > 0 && 'focus' in clientList[0] && 'navigate' in clientList[0]) {
          const client = clientList[0];
          client.navigate(targetUrl);
          return client.focus();
        }
        // Otherwise, open a fresh window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

/* ==========================================================================
   Message Event (Client Communication)
   ========================================================================== */

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
