self.onconnect = event => {
  const port = event.ports[0];

  port.onmessage = messageEvent => {
    if (messageEvent.data && messageEvent.data.type === "test") {
      port.postMessage({
        type: "shared-worker-response",
        message: "shared-worker-success",
      });
    }
  };

  port.start();
};
