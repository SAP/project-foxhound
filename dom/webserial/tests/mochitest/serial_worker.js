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
    // Note that most of this is tested in idlharness tests in
    // testing/web-platform/tests/serial/idlharness.https.any.js, this is just
    // a few extra tests
    test(!!navigator.serial, "navigator.serial should be defined in worker");

    test(
      navigator.serial instanceof EventTarget,
      "navigator.serial should be an EventTarget in worker"
    );

    let initialOnConnect = navigator.serial.onconnect;
    navigator.serial.onconnect = () => {};
    test(
      typeof navigator.serial.onconnect === "function",
      "Should be able to assign onconnect event handler in worker"
    );
    navigator.serial.onconnect = initialOnConnect;

    let initialOnDisconnect = navigator.serial.ondisconnect;
    navigator.serial.ondisconnect = () => {};
    test(
      typeof navigator.serial.ondisconnect === "function",
      "Should be able to assign ondisconnect event handler in worker"
    );
    navigator.serial.ondisconnect = initialOnDisconnect;

    let eventListenerCalled = false;
    const testListener = () => {
      eventListenerCalled = true;
    };
    navigator.serial.addEventListener("connect", testListener);
    navigator.serial.removeEventListener("connect", testListener);
    test(
      !eventListenerCalled,
      "Should be able to add and remove event listeners without errors"
    );

    let ports = await navigator.serial.getPorts();
    test(Array.isArray(ports), "getPorts() should return an array in worker");

    test(
      ports.length === 0,
      "getPorts() should return empty array initially in worker"
    );

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.message}`,
    });
  }
}

runTests();
