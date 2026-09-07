self.addEventListener("install", function () {
  console.log("install");
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  console.log("activate");
  e.waitUntil(self.clients.claim());
});

self.onnotificationclick = function (event) {
  console.log("onnotificationclick");
  let urlParam = "";
  if (event.action) {
    urlParam = `?action=${event.action}`;
  }
  self.clients.openWindow("open_window_target.html" + urlParam);
  event.notification.close();
};
