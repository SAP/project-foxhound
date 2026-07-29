/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

function test(condition, message) {
  self.postMessage({
    type: "test",
    result: condition,
    message,
  });
}

async function runTests() {
  try {
    // Step 1: Get ports - should see the port granted in the window.
    const ports = await navigator.serial.getPorts();
    test(ports.length === 1, "Worker B should see 1 granted port initially");

    const checkPromise = new Promise(resolve => {
      self.onmessage = e => {
        if (e.data === "check") {
          resolve();
        }
      };
    });

    // Tell the main thread we have the port.
    self.postMessage({ type: "ready" });

    // Wait for the main thread to tell us the other worker has forgotten it.
    await checkPromise;

    // Step 2: Call getPorts() again - the port should be gone.
    const portsAfter = await navigator.serial.getPorts();
    test(
      portsAfter.length === 0,
      "Worker B getPorts() should return 0 ports after Worker A forget"
    );

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.name}: ${e.message}\n${e.stack}`,
    });
  }
}

runTests();
