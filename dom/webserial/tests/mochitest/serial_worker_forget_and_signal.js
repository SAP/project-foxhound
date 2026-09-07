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
    const forgetPromise = new Promise(resolve => {
      self.onmessage = e => {
        if (e.data === "forget") {
          resolve();
        }
      };
    });

    const ports = await navigator.serial.getPorts();
    test(ports.length === 1, "Worker A should see 1 granted port");

    const port = ports[0];
    test(port instanceof SerialPort, "Port should be a SerialPort instance");

    // Wait for main thread to tell us to forget.
    await forgetPromise;

    await port.forget();
    test(true, "Worker A forget() should resolve without error");

    const portsAfter = await navigator.serial.getPorts();
    test(
      portsAfter.length === 0,
      "Worker A getPorts() should return 0 ports after forget"
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
