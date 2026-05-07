// ============================================================================
// SeguriCRM Service Worker — Secure PWA for a private CRM
// ============================================================================
// STRATEGY: Cache-only for safe static assets. Network-only for everything else.
//
// WHAT IS CACHED (cache-first):
//   - Icon images (/icons/*)
//   - Logo (/logo.svg)
//   - Offline fallback page (/offline.html)
//   - Manifest (/manifest.json)
//
// WHAT IS NEVER CACHED (network-only):
//   - /api/* — all API responses (private data)
//   - supabase.co — auth & database
//   - googleapis.com — fonts (freshness)
//   - HTML pages / navigation — could contain session data
//   - Any non-GET request
//
// NAVIGATION:
//   - Always goes to network.
//   - If offline → shows /offline.html from cache.
//   - Never caches the HTML shell to avoid stale sessions.
// ============================================================================

const CACHE_NAME = 'seguricrm-static-v2'
const OFFLINE_URL = '/offline.html'

// Only truly static, public, non-sensitive assets
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/logo.svg',
]

// URL patterns that must NEVER be cached — always network
const NEVER_CACHE_PATTERNS = [
  '/api/',
  'supabase.co',
  'googleapis.com',
  'supabase.com',
]

// File extensions that are safe to cache (static assets only)
const CACHEABLE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.otf',
  '.css', '.js',
]

// ---- INSTALL: precache safe static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ---- ACTIVATE: clean up old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

// ---- FETCH: secure routing ----
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') return

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!request.url.startsWith('http')) return

  // NEVER cache API calls, Supabase, or auth routes
  if (NEVER_CACHE_PATTERNS.some((pattern) => request.url.includes(pattern))) {
    // Network-only — no fallback, no caching
    return
  }

  // NAVIGATION requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // STATIC ASSETS: cache-first for safe file types
  const url = new URL(request.url)
  const isCacheableExtension = CACHEABLE_EXTENSIONS.some((ext) =>
    url.pathname.endsWith(ext)
  )

  if (isCacheableExtension) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          // Only cache successful responses from our own origin
          if (response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // EVERYTHING ELSE: network-only — no caching, no fallback
  // This covers HTML fragments, JSON, and any uncategorized requests
})
