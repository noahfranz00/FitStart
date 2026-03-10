// ═══════════════════════════════════════════
// SW.JS — Service Worker for Blueprint PWA
// Caches app shell for offline workout tracking
// ═══════════════════════════════════════════

var CACHE_NAME = 'blueprint-v2';
var APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/storage.js',
  '/js/app.js',
  '/js/scoring.js',
  '/js/nutrition.js',
  '/js/progress.js',
  '/js/workout.js',
  '/js/logger.js',
  '/js/coach.js'
];

// Domains that should NEVER be cached (AI API, food databases)
var NO_CACHE_DOMAINS = [
  'fitstart-api.noah-0c3.workers.dev',
  'api.anthropic.com',
  'api.nal.usda.gov',
  'world.openfoodfacts.org',
  'wger.de'
];

function isSameOriginAsset(url) {
  return url.origin === self.location.origin;
}

function shouldBypassCache(url) {
  for (var i = 0; i < NO_CACHE_DOMAINS.length; i++) {
    if (url.hostname === NO_CACHE_DOMAINS[i]) return true;
  }
  return false;
}

function isCacheableRequest(request, url) {
  if (request.method !== 'GET') return false;
  if (shouldBypassCache(url)) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return true;
}

// Install: cache the app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL).catch(function(err) {
        console.warn('[SW] Some files failed to cache:', err);
        return Promise.all(APP_SHELL.map(function(url) {
          return cache.add(url).catch(function() {
            console.warn('[SW] Failed to cache:', url);
          });
        }));
      });
    })
  );

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
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  if (!isCacheableRequest(request, url)) return;

  // Never cache API/database calls — always go to network
  if (shouldBypassCache(url)) return;

  // Navigation requests: network first, cached app shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function(response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put('/index.html', clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('/index.html').then(function(cached) {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // Fonts/CDN: cache first
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com'
  ) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(response) {
          if (response && response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // YouTube/media: network with cache fallback
  if (url.hostname.indexOf('youtube.com') !== -1 || url.hostname.indexOf('ytimg.com') !== -1) {
    event.respondWith(
      fetch(request).then(function(response) {
        return response;
      }).catch(function() {
        return caches.match(request).then(function(cached) {
          return cached || new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Same-origin app assets: stale-while-revalidate
  if (isSameOriginAsset(url)) {
    event.respondWith(
      caches.match(request).then(function(cached) {
        var fetchPromise = fetch(request).then(function(response) {
          if (response && response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(function() {
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        });

        return cached || fetchPromise;
      })
    );
  }
});
