"use strict";

console.log("WORKER: executing.");

var version = "v2.18::";
var offline = version + "offline";
var dynamic = version + "dynamic";

// Offline analytics settings
var idbDatabase = null;
var IDB_NAME = "mokole-kid";
var IDB_VERSION = 1;
var STOP_RETRYING_AFTER = 86400000; // One day, in milliseconds.
var STORE_NAME = "offline-analytics";
var CUSTOM_DIMENSION = "Offline";
// Bypass Adsense
var ADS_URL = "//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

var cachedFirst = [
	"/kids/",
	"/kids/index.html",
	"/kids/favicon.ico",
	"/kids/img/tinified/hand1-64.png",
	"/kids/img/tinified/hand2-64.png",
	"/kids/img/tinified/loading.png",
	"/kids/img/tinified/mokole-kids.png",
	"/kids/img/tinified/sprite-volume.png",
	"/kids/img/tinified/wood-bg-01.png",
	"/kids/img/tinified/wood-bg-02.png",
	"/kids/img/tinified/wood-bg-03.png",
	"/kids/sound/newgame.mp3",
	"/kids/sound/good.mp3",
	"/kids/sound/wrong.mp3",
	"/kids/sound/win.mp3",
	"/kids/manifest.json"
];

var notCached = [
	"/kids/easy.json",
	"/kids/hard.json",
	"/kids/mokole-kids.json"	
];

// Offline Analytics
(function openDatabaseAndReplayRequests() {
	console.log("ANALYTICS: starting openDatabaseAndReplayRequests()");
	var indexedDBOpenRequest = indexedDB.open(IDB_NAME, IDB_VERSION);
	indexedDBOpenRequest.onerror = function(error) {
		console.error("ANALYTICS: onerror:", error);
	};
	indexedDBOpenRequest.onupgradeneeded = function() {
		console.log("ANALYTICS: onupgrdeneeded", this);
		var db = this.result;
		if (!db.objectStoreNames.contains(STORE_NAME)) {
			var objectStore = db.createObjectStore(STORE_NAME, {keyPath: "url"});
			//objectStore.createIndex("timestamp", "timestamp", {unique: false});
		}
	};
	indexedDBOpenRequest.onsuccess = function() {
		console.log("ANALYTICS: onsuccess", this);
		idbDatabase = this.result;
		replayAnalyticsRequests();
	};
})();
function getObjectStore(storeName, mode) {
	var transaction =  idbDatabase.transaction(storeName, mode);
	transaction.oncomplete = function() {
		console.log("ANALYTICS: transaction oncomplete.");	
	};
	transaction.onerror = function(error) {
		console.log("ANALYTICS: transaction onerror.", error);	
	};
	var objectStore = transaction.objectStore(storeName);
	objectStore.onerror = function(error) {
		console.log("ANALYTICS: objectStore error.", error);	
	};
	return objectStore;
}
function replayAnalyticsRequests() {
	var savedRequests = [];
	getObjectStore(STORE_NAME).openCursor().onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			savedRequests.push(cursor.value);
			cursor.continue();
		} else {
			savedRequests.forEach(function(savedRequest) {
				var queueTime = Date.now() - savedRequest.timestamp;
				if (queueTime > STOP_RETRYING_AFTER) {
					getObjectStore(STORE_NAME, "readwrite").delete(savedRequest.url);
					console.warn("ANALYTICS: Request has been queued for %d milliseconds. " +
					"No longer attempting to replay.", queueTime);
				} else {
					var requestUrl = savedRequest.url + "&qt=" + queueTime + "&cd1=" + CUSTOM_DIMENSION;
					fetch(requestUrl).then(function(response) {
						if (response.status < 400) {
							getObjectStore(STORE_NAME, "readwrite").delete(savedRequest.url);
						} else {
							console.error("ANALYTICS: Replaying failed:", response);
						}
					}).catch(function(error) {
						console.error("ANALYTICS: Replaying failed:", error);
					});
				}
			});
		}
	};
}

// Events listeners
self.addEventListener("fetch", function(event) {
	if ((event.request.method !== "GET") || (event.request.url.indexOf("data:") == 0) || notCached.some(function(v) { return event.request.url.indexOf(v) >= 0; })) {
		console.log("WORKER: fetch event ignored.", event.request.method, event.request.url);
		return;
	}
	// Adsense
	if (event.request.url.indexOf(ADS_URL) !== -1) {
		console.log("WORKER: fetch event ignored.", event.request.method, event.request.url);
		return;
	}	
	var url = new URL(event.request.url);
	if ((url.hostname === "www.google-analytics.com" ||
	url.hostname === "ssl.google-analytics.com") &&
	url.pathname.indexOf("/collect") != -1) {
		//Analytics 
		if (idbDatabase) {
			console.log("WORKER: handling analytics request", event.request.url);
			event.respondWith(
				fetch(event.request).then(function(response) {
					if (response.status == 0) console.log(response.clone());
					if (response.status >= 400) {
						throw Error("ANALYTICS: Error status returned from Google Analytics request.");
					}			
					return response;
				}).catch(function(error) {
					getObjectStore(STORE_NAME, "readwrite").add({
						url: event.request.url,
						timestamp: Date.now()
					});				
					return error;
				})
			);			
		} else {
			console.log("WORKER: fetch event ignored.", event.request.method, event.request.url);
			return;
		}
	} else {
		// Else...
		event.respondWith(
			caches.open(offline).then(function(cache) {
				function fetchedOfflineFromNetwork(response) {
					caches.open(offline).then(function add(cache) {
						return cache.put(event.request, response);
					}).then(function() {
						console.log("WORKER: fetch response stored in offline cache.", event.request.url);
					}).catch(function(error) {
						console.log(error, event.request);
					});
				}
				function fetchedDynamicFromNetwork(response) {
					var cacheCopy = response.clone();
					caches.open(dynamic).then(function add(cache) {
						return cache.put(event.request, cacheCopy);
					}).then(function() {
						console.log("WORKER: fetch response stored in dynamic cache.", event.request.url);
					}).catch(function(error) {
						console.log(error, event.request);
					});
					return response;
				}
				function unableToResolve() {
					console.log("WORKER: unable to resolve", event.request.url);
			        return new Response("<h1>Service Unavailable</h1>", {
						status: 503,
						statusText: "Service Unavailable",
						headers: new Headers({
							"Content-Type": "text/html"
						})
					});
				}
				return cache.match(event.request, {ignoreSearch: true}).then(function(cachedOffline) {
					if (cachedOffline) {
						console.log("WORKER: fetch event [offline cached]", event.request.url);
						if (event.request.url.indexOf("?") == -1) {
							fetch(event.request).then(fetchedOfflineFromNetwork, unableToResolve).catch(unableToResolve);
						}
						return cachedOffline;
					}
					return fetch(event.request).then(fetchedDynamicFromNetwork, function() {
						caches.open(dynamic).then(function(cache) {
							match(event.request).then(function(cachedDynamic) {
								if (!cachedDynamic) {
									return unableToResolve();
								}
								console.log("WORKER: fetch event [dynamic cached]", event.request.url);
								return cachedDynamic;
							});
						});
					}).catch(unableToResolve);
				});
			})
		);		
	}
});

self.addEventListener("install", function(event) {
  console.log("WORKER: install event in progress.");
  event.waitUntil(
    caches
      .open(offline)
      .then(function(cache) {
        return cache.addAll(cachedFirst);
      })
      .then(function() {
        console.log("WORKER: install completed");
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function(event) {
  console.log("WORKER: activate event in progress.");
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return !key.startsWith(version);
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        console.log("WORKER: activate completed.");
        return self.clients.claim();
      })
  );
});
