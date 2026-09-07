"use strict";

function handleRequest(request, response) {
  response.setHeader("Content-Type", "application/javascript", false);
  response.write(`\
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("message", function (e) {
  var data = e.data;
  var url = "http://localhost:21555/?type=" + data.type + "&rand=" + data.rand;
  fetch(url).then(function () {
    return self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  }).then(function (clients) {
    for (var i = 0; i < clients.length; i++) {
      clients[i].postMessage({ status: "OK" });
    }
  }).catch(function (ex) {
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        clients[i].postMessage({ status: "FAIL", error: ex.message });
      }
    });
  });
});
`);
}
