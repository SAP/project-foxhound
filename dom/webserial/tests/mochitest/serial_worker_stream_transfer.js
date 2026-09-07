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

self.onmessage = async function (e) {
  const { testName } = e.data;

  try {
    switch (testName) {
      case "readableTransfer":
        await testReadableTransfer(e.data);
        break;
      case "writableTransfer":
        await testWritableTransfer(e.data);
        break;
      case "bothTransfer":
        await testBothTransfer(e.data);
        break;
      default:
        self.postMessage({
          type: "error",
          message: `Unknown test: ${testName}`,
        });
        return;
    }
    self.postMessage({ type: "done" });
  } catch (ex) {
    self.postMessage({
      type: "error",
      message: `${testName} failed: ${ex.name}: ${ex.message}`,
    });
  }
};

async function testReadableTransfer(data) {
  const readable = data.readable;

  test(
    readable instanceof ReadableStream,
    "Should receive a ReadableStream in worker"
  );

  const reader = readable.getReader();
  const { value, done } = await reader.read();

  test(!done, "Read should not be done");
  test(
    value instanceof Uint8Array,
    "Should receive Uint8Array from transferred readable"
  );

  const decoder = new TextDecoder();
  const text = decoder.decode(value);
  test(
    text === "TransferRead",
    `Should receive 'TransferRead' but got '${text}'`
  );

  reader.releaseLock();
}

async function testWritableTransfer(data) {
  const writable = data.writable;

  test(
    writable instanceof WritableStream,
    "Should receive a WritableStream in worker"
  );

  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  await writer.write(encoder.encode("WorkerWrite"));

  test(true, "Should write data through transferred writable");

  writer.releaseLock();
}

async function testBothTransfer(data) {
  const readable = data.readable;
  const writable = data.writable;

  test(
    readable instanceof ReadableStream,
    "Should receive a ReadableStream in worker"
  );

  test(
    writable instanceof WritableStream,
    "Should receive a WritableStream in worker"
  );

  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  await writer.write(encoder.encode("RoundTrip"));
  writer.releaseLock();

  test(true, "Should write data through transferred writable");

  const reader = readable.getReader();
  const { value, done } = await reader.read();

  test(!done, "Read should not be done");
  test(
    value instanceof Uint8Array,
    "Should receive Uint8Array from transferred readable"
  );

  const decoder = new TextDecoder();
  const text = decoder.decode(value);
  test(text === "RoundTrip", `Should receive 'RoundTrip' but got '${text}'`);

  reader.releaseLock();
}
