/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

function test(condition, message) {
  self.postMessage({ type: "test", result: condition, message });
}

async function runTests() {
  try {
    const ports = await navigator.serial.getPorts();

    test(
      ports.length === 1,
      "Worker should see the port granted from the window"
    );

    const port = ports[0];
    test(port.connected, "Port should be connected initially");

    const disconnectPromise = new Promise(resolve => {
      port.ondisconnect = () => resolve();
    });

    self.postMessage({ type: "ready_for_disconnect" });

    await disconnectPromise;

    test(!port.connected, "Port should be disconnected after disconnect event");

    const connectPromise = new Promise(resolve => {
      navigator.serial.addEventListener("connect", e => resolve(e.target), {
        once: true,
      });
    });

    self.postMessage({ type: "ready_for_connect" });

    const connectedPort = await connectPromise;
    test(connectedPort === port, "Reconnected port should be the same object");
    test(
      connectedPort.connected,
      "Port should be connected after connect event"
    );

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.name}: ${e.message}`,
    });
  }
}

runTests();
