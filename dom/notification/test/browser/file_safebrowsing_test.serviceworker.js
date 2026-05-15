// Service worker that shows a notification when receiving a message
self.addEventListener("message", async event => {
  try {
    await self.registration.showNotification("Test notification from SW");
    event.source.postMessage({ success: true });
  } catch (e) {
    event.source.postMessage({ success: false, error: e.message });
  }
});
