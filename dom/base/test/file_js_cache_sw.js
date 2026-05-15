addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});

addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
