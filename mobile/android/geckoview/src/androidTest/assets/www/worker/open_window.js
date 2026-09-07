navigator.serviceWorker.register("./service-worker.js", {
  scope: ".",
});

let params = new URL(location.href).searchParams;
/** @type {NotificationOptions} */
let options = {
  body: "Hello",
};
if (params.has("action")) {
  options.actions = [{ action: params.get("action"), title: "action" }];
}

function showNotification() {
  Notification.requestPermission(function (result) {
    if (result === "granted") {
      navigator.serviceWorker.ready.then(function (registration) {
        registration.showNotification("Open Window Notification", options);
      });
    }
  });
}
