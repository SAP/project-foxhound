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

    await port.open({ baudRate: 9600 });
    test(true, "port.open() should resolve");

    const disconnectPromise = new Promise(resolve => {
      port.ondisconnect = () => resolve();
    });

    self.postMessage({ type: "ready_for_disconnect" });
    await disconnectPromise;

    test(!port.connected, "Port should be disconnected after disconnect event");

    const reconnectPromise = new Promise(resolve => {
      port.onconnect = () => resolve();
    });

    self.postMessage({ type: "ready_for_reconnect" });
    await reconnectPromise;

    test(port.connected, "Port should be connected after reconnect");

    await port.open({ baudRate: 9600 });
    test(true, "port.open() should succeed after reconnect");

    await port.close();
    test(true, "port.close() should succeed after reopen");

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.name}: ${e.message}`,
    });
  }
}

runTests();
