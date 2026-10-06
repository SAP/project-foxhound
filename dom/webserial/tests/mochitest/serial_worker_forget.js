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
    const ports = await navigator.serial.getPorts();

    test(ports.length === 1, "Worker should see 1 granted port");

    const port = ports[0];
    test(port instanceof SerialPort, "Port should be a SerialPort instance");

    // Call forget() from the worker
    await port.forget();

    test(true, "forget() should resolve without error in worker");

    // Verify the port is actually forgotten
    const portsAfter = await navigator.serial.getPorts();
    test(
      portsAfter.length === 0,
      "Worker getPorts() should return 0 ports after forget"
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
