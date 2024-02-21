"use strict";

const CACHE_NAME = 'v1';
const urlsToCache = [
  '',
  'index.html',
  'words.json',
  'qr-code-mokole.png',
  'favicon.png',
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
