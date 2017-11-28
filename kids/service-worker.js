var version = "v1.3::";

self.addEventListener("install", function (e) {
	console.log("worker: install event fired.");
	event.waitUntil(
		caches.open(version + "mk").then(function (cache) {
			return cache.addAll([
				"favicon.ico",
				"img/tinified/hand1-64.png",
				"img/tinified/hand2-64.png",
				"img/tinified/loading.apng",
				"img/tinified/mokole-kids.png",
				"img/tinified/sprite-volume.png",
				"img/tinified/wood-bg-01.png",
				"img/tinified/wood-bg-02.png",
				"img/tinified/wood-bg-03.png",
				"sound/newgame.mp3",
				"sound/good.mp3",
				"sound/wrong.mp3",
				"sound/win.mp3"
			]);
		}).then(console.log("worker: install complete."))
	);
// 	return self.skipWaiting();
});

self.addEventListener("fetch", function (e) {
	console.log("worker: fetch event fired.");
});

self.addEventListener("activate", function (e) {
	console.log("worker: activate event fired.");
	event.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(
				keys.filter(function (key) { return !key.startWith(version); }).map(function (key) {
					return caches.delete(key);
				})
			)
		}).then(console.log("worker: activate completed."))
	);
// 	return self.clients.claim();
});
