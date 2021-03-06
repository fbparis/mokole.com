"use strict";

/* Strategy: cache then network */

var cacheName = 'qwixx-cache-v0.1';
var appFiles = [
	'/qwixx/',
	'/qwixx/index.html',
	'/qwixx/android-icon-144x144.png',
	'/qwixx/android-icon-192x192.png',
	'/qwixx/android-icon-36x36.png',
	'/qwixx/android-icon-48x48.png',
	'/qwixx/android-icon-72x72.png',
	'/qwixx/android-icon-96x96.png',
	'/qwixx/apple-icon-114x114.png',
	'/qwixx/apple-icon-120x120.png',
	'/qwixx/apple-icon-144x144.png',
	'/qwixx/apple-icon-152x152.png',
	'/qwixx/apple-icon-180x180.png',
	'/qwixx/apple-icon-57x57.png',
	'/qwixx/apple-icon-60x60.png',
	'/qwixx/apple-icon-72x72.png',
	'/qwixx/apple-icon-76x76.png',
	'/qwixx/apple-icon-precomposed.png',
	'/qwixx/apple-icon.png',
	'/qwixx/browserconfig.xml',
	'/qwixx/favicon-16x16.png',
	'/qwixx/favicon-32x32.png',
	'/qwixx/favicon-96x96.png',
	'/qwixx/favicon.ico',
	'/qwixx/manifest.json',
	'/qwixx/ms-icon-144x144.png',
	'/qwixx/ms-icon-150x150.png',
	'/qwixx/ms-icon-310x310.png',
	'/qwixx/ms-icon-70x70.png',
	'/qwixx/normalize.css',
	'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css',
	'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/webfonts/fa-solid-900.woff2' 
	// '/qwixx/all.min.css',
	// '/qwixx/fa-solid-900.woff2'
];

self.addEventListener('install', (e) => {
	console.log('[Service Worker] Install');
	e.waitUntil(
		caches.open(cacheName).then((cache) => {
			console.log('[Service Worker] Caching all: app shell and content');
			return cache.addAll(appFiles);
		})
	);
});

self.addEventListener('fetch', (e) => {
	e.respondWith(
		caches.match(e.request).then((r) => {
			console.log('[Service Worker] Fetching resource: '+e.request.url);
			return r || fetch(e.request).then((response) => {
				return caches.open(cacheName).then((cache) => {
					console.log('[Service Worker] Caching new resource: '+e.request.url);
					cache.put(e.request, response.clone());
					return response;
				});
			});
		})
	);
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(keyList.map((key) => {
				if(cacheName.indexOf(key) === -1) {
					return caches.delete(key);
				}
			}));
		})
	);
});
