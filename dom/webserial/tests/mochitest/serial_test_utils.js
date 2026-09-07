/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Lightweight Assert helpers for mochitest content tests.
// Assert.sys.mjs cannot be used directly from content because it accesses
// Components.stack. These helpers provide the same API for throws/rejects.
// Once bug 2029683 is fixed we can remove these.
// eslint-disable-next-line no-unused-vars
const Assert = {
  throws(block, expected, message) {
    let actual;
    try {
      block();
    } catch (e) {
      actual = e;
    }
    ok(!!actual, message + " - expected exception");
    if (actual) {
      _assertExpected(actual, expected, message);
    }
  },

  rejects(promise, expected, message) {
    return promise.then(
      () => ok(false, message + " - expected rejection"),
      err => _assertExpected(err, expected, message)
    );
  },
};

function _assertExpected(actual, expected, message) {
  if (expected instanceof RegExp) {
    ok(expected.test(actual), message);
  } else if (typeof expected === "function") {
    ok(expected(actual), message);
  } else {
    ok(actual instanceof expected, message);
  }
}

// Enable autoselect for mochitests by default
navigator.serial.autoselectPorts = true;

async function cleanupSerialPorts() {
  const ports = await navigator.serial.getPorts();

  for (const port of ports) {
    try {
      if (port.readable?.locked) {
        const reader = port.readable.getReader();
        reader.releaseLock();
      }
    } catch (e) {
      // Ignore errors
    }

    try {
      if (port.writable && port.writable.locked) {
        const writer = port.writable.getWriter();
        writer.releaseLock();
      }
    } catch (e) {
      // Ignore errors
    }

    try {
      await port.close();
    } catch (e) {
      // Ignore errors
    }

    try {
      await port.forget();
    } catch (e) {
      // Ignore errors
    }
  }

  // Note: We don't call removeAllMockDevices() here because that would
  // remove the default test devices that other tests depend on.
  // Hotplug tests should call navigator.serial.removeAllMockDevices()
  // explicitly if they need a completely clean slate.
}

async function simulateDeviceConnection(
  deviceId,
  devicePath,
  vendorId,
  productId
) {
  await navigator.serial.simulateDeviceConnection(
    deviceId,
    devicePath,
    vendorId,
    productId
  );
}

async function simulateDeviceDisconnection(deviceId) {
  await navigator.serial.simulateDeviceDisconnection(deviceId);
}
