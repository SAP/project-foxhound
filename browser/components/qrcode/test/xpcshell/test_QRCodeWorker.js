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

const CELL_SIZE = 20;
const MARGIN = 4 * CELL_SIZE;

add_task(async function test_worker_instantiation() {
  info("Testing QRCodeWorker can be instantiated");

  const worker = new QRCodeWorker();
  Assert.ok(worker, "QRCodeWorker instance should be created");

  // Clean up
  await worker.terminate();
});

add_task(async function test_worker_generateQRMatrix() {
  info("Testing QRCodeWorker generateQRMatrix returns matrix data");

  const worker = new QRCodeWorker();
  let result;
  try {
    result = await worker.generateQRMatrix("https://mozilla.org");
  } finally {
    await worker.terminate();
  }

  Assert.ok(Array.isArray(result.matrix), "Result should have a matrix array");
  Assert.equal(result.src, undefined, "Result should not include image data");
  Assert.equal(
    result.width,
    undefined,
    "Result should not include image width"
  );
  Assert.equal(
    result.height,
    undefined,
    "Result should not include image height"
  );
  Assert.greater(result.dotCount, 0, "Result should have a positive dotCount");
  Assert.equal(
    result.matrix.length,
    result.dotCount,
    "matrix should have dotCount rows"
  );
  Assert.equal(
    result.matrix[0].length,
    result.dotCount,
    "matrix rows should have dotCount columns"
  );
  Assert.ok(
    result.matrix[0][0],
    "top-left finder pattern corner should be dark"
  );
});

add_task(async function test_worker_getLogoPlacement() {
  info("Testing QRCodeWorker getLogoPlacement returns valid placement data");

  const worker = new QRCodeWorker();
  let placement;
  try {
    const { dotCount } = await worker.generateQRMatrix("https://mozilla.org");
    placement = await worker.getLogoPlacement(dotCount, MARGIN);
  } finally {
    await worker.terminate();
  }

  Assert.strictEqual(
    typeof placement.centerX,
    "number",
    "placement should have centerX"
  );
  Assert.strictEqual(
    typeof placement.centerY,
    "number",
    "placement should have centerY"
  );
  Assert.strictEqual(
    typeof placement.logoSize,
    "number",
    "placement should have logoSize"
  );
  Assert.strictEqual(
    typeof placement.showLogo,
    "boolean",
    "placement should have showLogo"
  );
});

add_task(async function test_worker_getLogoPlacement_small_qr() {
  info("Testing QRCodeWorker can place a logo on a version 1 QR code");

  const worker = new QRCodeWorker();
  let placement;
  try {
    placement = await worker.getLogoPlacement(
      21, // QR version 1 = 17 + 4×1 modules
      MARGIN
    );
  } finally {
    await worker.terminate();
  }

  Assert.ok(placement.showLogo, "Version 1 QR codes should still show a logo");
  Assert.greaterOrEqual(
    placement.logoSize,
    6 * CELL_SIZE,
    "Small QR codes should use at least the minimum viable logo size"
  );
});
