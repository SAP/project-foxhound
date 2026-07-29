self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "test") {
    event.source.postMessage({
      type: "service-worker-response",
      message: "service-worker-success",
    });
  }
});
