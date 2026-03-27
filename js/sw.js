// ═══════════════════════════════════════════
// SW.JS — Service Worker for Blueprint PWA
// Caches app shell for offline workout tracking
// ═══════════════════════════════════════════

var CACHE_NAME = 'blueprint-v1';
var APP_SHELL = [
  '/',
  '/index.html',
  '/storage.js',
  '/app.js',
  '/scoring.js',
  '/nutrition.js',
  '/progress.js',
  '/workout.js',
  '/logger.js',
  '/coach.js',
  '/styles.css'
];

// Domains that should NEVER be cached (AI API, food databases)
var NO_CACHE_DOMAINS = [
  'fitstart-api.noah-0c3.workers.dev',
  'api.anthropic.com',
  'api.nal.usda.gov',
  'world.openfoodfacts.org',
  'wger.de'
];

// Install: cache the app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL).catch(function(err) {
        // Don't fail install if a single file fails — cache what we can
        console.warn('[SW] Some files failed to cache:', err);
        return Promise.all(APP_SHELL.map(function(url) {
          return cache.add(url).catch(function() {
            console.warn('[SW] Failed to cache:', url);
          });
        }));
      });
    })
  );
  // Activate immediately, don't wait for old SW to die
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Never cache API/database calls — always go to network
  for (var i = 0; i < NO_CACHE_DOMAINS.length; i++) {
    if (url.hostname === NO_CACHE_DOMAINS[i]) {
      // Network only — if offline, let it fail naturally
      // (the app's callClaude() already handles network errors with toast)
      return;
    }
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // For fonts (Google Fonts, CDN), use cache-first with network fallback
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // For YouTube embeds and images — network with cache fallback
  if (url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // App shell and local assets: stale-while-revalidate
  // Serve from cache immediately, then update cache in background
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        // Network failed — return cached version or a simple offline message
        if (cached) return cached;
        // If this is a navigation request and we have no cache, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });

      // Return cached immediately if available, otherwise wait for network
      return cached || fetchPromise;
    })
  );
});
