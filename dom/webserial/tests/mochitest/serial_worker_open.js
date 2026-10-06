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

    await port.open({ baudRate: 9600 });

    test(true, "port.open() should resolve");

    test(
      !!port.readable,
      "port.readable should be non-null after open in worker"
    );

    test(
      !!port.writable,
      "port.writable should be non-null after open in worker"
    );
    const writer = port.writable.getWriter();
    test(!!writer, "port.writable.getWriter() should be non-null");
    const encoder = new TextEncoder();
    await writer.write(encoder.encode("Echo"));
    writer.releaseLock();

    const reader = port.readable.getReader();
    test(!!reader, "Should get readable stream reader");

    const { value, done } = await reader.read();
    test(!done, "Read should not be done");
    test(value instanceof Uint8Array, "Should receive Uint8Array");

    const decoder = new TextDecoder();
    const received = decoder.decode(value);
    test(received === "Echo", "Should receive echoed data");

    reader.releaseLock();
    await port.close();

    test(true, "port.close() should resolve");

    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: `Test failed: ${e.name}: ${e.message}`,
    });
  }
}

runTests();
