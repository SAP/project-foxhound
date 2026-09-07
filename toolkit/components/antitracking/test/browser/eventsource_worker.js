self.onconnect = function (e) {
  let port = e.ports[0];

  const es = new EventSource("eventsource_message.sjs");
  es.onmessage = function () {
    es.close();
    port.postMessage("done");
    port.start();
  };
};
