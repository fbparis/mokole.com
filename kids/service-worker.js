var version = "v1:0:1";

self.addEventListener("install", function (e) {
	console.log("worker: install event fired.");
});

self.addEventListener("fetch", function (e) {
	console.log("worker: fetch event fired.");
});

self.addEventListener("activate", function (e) {
	console.log("worker: activate event fired.");
});
