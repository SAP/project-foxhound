/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
/* global SerialPort */
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
    test(ports.length === 1, "Worker should see 1 granted port initially");

    const port = ports[0];
    test(port instanceof SerialPort, "Port should be a SerialPort instance");

    const forgottenPromise = new Promise(resolve => {
      self.onmessage = e => {
        if (e.data === "forgotten") {
          resolve();
        }
      };
    });

    // Tell the main thread we have the port and it can forget it.
    self.postMessage({ type: "ready" });

    // Wait for the main thread to tell us it has forgotten the port.
    await forgottenPromise;

    // Step 2: Call getPorts() again after the main thread forgot the port.
    const portsAfter = await navigator.serial.getPorts();
    test(
      portsAfter.length === 0,
      "Worker getPorts() should return 0 ports after main thread forget"
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
