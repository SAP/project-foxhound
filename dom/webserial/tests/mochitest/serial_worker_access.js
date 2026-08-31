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

    test(Array.isArray(ports), "getPorts() should return an array in worker");

    test(
      !!ports.length,
      "getPorts() should return ports granted in window context"
    );

    const port = ports[0];

    test(
      port instanceof SerialPort,
      "Port from getPorts() should be a SerialPort instance in worker"
    );

    test(
      typeof port.connected === "boolean",
      "Port should have connected property in worker"
    );

    test(
      port.connected === true,
      "Port should be connected initially in worker"
    );

    test("readable" in port, "Port should have readable property in worker");

    test(
      port.readable === null,
      "Port readable should be null when closed in worker"
    );

    test("writable" in port, "Port should have writable property in worker");

    test(
      port.writable === null,
      "Port writable should be null when closed in worker"
    );

    test(
      typeof port.getInfo === "function",
      "Port should have getInfo method in worker"
    );

    const info = port.getInfo();
    test(
      typeof info === "object" && info !== null,
      "getInfo() should return an object in worker"
    );
    test(info.usbVendorId === 0x2341, "Port should have correct usbVendorId");
    test(info.usbProductId === 0x0043, "Port should have correct usbProductId");

    test(
      typeof port.open === "function",
      "Port should have open method in worker"
    );

    test(
      typeof port.close === "function",
      "Port should have close method in worker"
    );

    test(
      typeof port.getSignals === "function",
      "Port should have getSignals method in worker"
    );

    test(
      typeof port.setSignals === "function",
      "Port should have setSignals method in worker"
    );

    test(
      typeof port.forget === "function",
      "Port should have forget method in worker"
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
