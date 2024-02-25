"use strict";

const CACHE_NAME = 'v16';
const urlsToCache = [
  '/v3/',
  'index.html',
  'words.json',
  'qr-code-mokole.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'manifest.json',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const urlObj = new URL(event.request.url);
  const urlWithoutQuery = `${urlObj.origin}${urlObj.pathname}`;
  event.respondWith(
    caches.match(urlWithoutQuery)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return clients.claim();
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
