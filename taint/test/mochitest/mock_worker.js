onconnect = function (event) {

    const port = event.ports[0];

    port.onmessage = function (event) {
        const result = event.data;
        port.postMessage(result);
    };

    port.start();
}
