/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test QRCodeWorker functionality
 */

const { QRCodeWorker } = ChromeUtils.importESModule(
  "moz-src:///browser/components/qrcode/QRCodeWorker.sys.mjs"
);

add_task(async function test_worker_instantiation() {
  info("Testing QRCodeWorker can be instantiated");

  const worker = new QRCodeWorker();
  Assert.ok(worker, "QRCodeWorker instance should be created");

  // Clean up
  await worker.terminate();
});

add_task(async function test_worker_responds_to_ping() {
  info("Testing QRCodeWorker responds to ping message");
  const worker = new QRCodeWorker();

  // Test ping functionality
  const response = await worker.ping();
  Assert.equal(response, "pong", "Worker should respond with 'pong' to ping");

  // Clean up
  await worker.terminate();
});

add_task(async function test_worker_can_load_qrcode_library() {
  info("Testing QRCodeWorker can load QRCode library");

  const worker = new QRCodeWorker();

  // Test that the worker can check if the QRCode library is available
  const hasLibrary = await worker.hasQRCodeLibrary();
  Assert.ok(hasLibrary, "Worker should have access to QRCode library");

  // Clean up
  await worker.terminate();
});

add_task(async function test_worker_can_generate_simple_qrcode() {
  info("Testing QRCodeWorker can generate a simple QR code");

  const worker = new QRCodeWorker();

  // Test generating a very simple QR code
  const testUrl = "https://mozilla.org";
  const result = await worker.generateQRCode(testUrl);

  Assert.ok(result, "Should get a result from generateQRCode");
  Assert.ok(result.width, "Result should have a width");
  Assert.ok(result.height, "Result should have a height");
  Assert.ok(result.src, "Result should have a src data URI");
  Assert.ok(result.src.startsWith("data:image/"), "src should be a data URI");

  // Clean up
  await worker.terminate();
});
