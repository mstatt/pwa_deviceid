// Device ID PWA Service Worker

const CACHE_NAME = 'device-id-pwa-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/fingerprint2.min.js',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.0/fingerprint2.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
    // Skip waiting to ensure the new service worker activates immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service worker: Caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service worker: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    
    // Claim clients to ensure the service worker controls all pages immediately
    return self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // If the resource is in cache, return it
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Don't cache responses from external domains (like CDNs)
                        if (!event.request.url.startsWith(self.location.origin) && 
                            !event.request.url.includes('cdnjs.cloudflare.com')) {
                            return networkResponse;
                        }
                        
                        // Cache the fetched response
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                // Create a clone of the response since it can only be used once
                                const responseToCache = networkResponse.clone();
                                cache.put(event.request, responseToCache);
                                return networkResponse;
                            });
                    })
                    .catch(error => {
                        console.error('Service worker fetch error:', error);
                        // You could return a custom offline page here
                    });
            })
    );
});

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
