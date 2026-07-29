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

    // Set up disconnect listener. If GC collected the port, this would never
    // fire.
    const disconnectPromise = new Promise(resolve => {
      port.ondisconnect = () => {
        resolve();
      };
    });

    // Tell the parent page we are ready for the device disconnection.
    self.postMessage({ type: "ready" });

    await disconnectPromise;

    test(true, "ondisconnect event fired in worker");
    test(!port.connected, "Port should be disconnected after event");

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.name}: ${e.message}`,
    });
  }
}

runTests();
