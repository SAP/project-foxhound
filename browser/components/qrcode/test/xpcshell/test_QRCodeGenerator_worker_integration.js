/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test QRCodeGenerator with worker integration
 */

const { QRCodeGenerator } = ChromeUtils.importESModule(
  "moz-src:///browser/components/qrcode/QRCodeGenerator.sys.mjs"
);

/**
 * Helper function to create a minimal mock document with required methods
 */
function createMockDocument() {
  return {
    createElementNS: (ns, tagName) => {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            imageSmoothingEnabled: false,
            imageSmoothingQuality: "high",
            fillStyle: "white",
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            drawImage: () => {},
          }),
          toDataURL: () => "data:image/png;base64,mock",
        };
      } else if (tagName === "img") {
        return {
          onload: null,
          onerror: null,
          set src(value) {
            // Simulate image load
            Services.tm.dispatchToMainThread(() => {
              if (this.onload) {
                this.onload();
              }
            });
          },
        };
      }
      return {};
    },
  };
}

add_task(async function test_generator_uses_worker() {
  info("Testing QRCodeGenerator generates QR code using worker");

  const mockDocument = createMockDocument();

  // Generate a QR code using the worker
  const testUrl = "https://mozilla.org";
  const dataUri = await QRCodeGenerator.generateQRCode(testUrl, mockDocument);

  Assert.ok(dataUri, "Should get a data URI from generateQRCode");
  Assert.ok(dataUri.startsWith("data:image/"), "Should be a data URI");

  // Worker is automatically cleaned up after generation
});

add_task(async function test_generator_multiple_generations() {
  info("Testing QRCodeGenerator can generate multiple QR codes");

  // Generate first QR code
  const dataUri1 = await QRCodeGenerator.generateQRCode(
    "https://mozilla.org",
    createMockDocument()
  );
  Assert.ok(dataUri1, "Should get first data URI");

  // Generate second QR code
  const dataUri2 = await QRCodeGenerator.generateQRCode(
    "https://firefox.com",
    createMockDocument()
  );
  Assert.ok(dataUri2, "Should get second data URI");

  // Each call creates and cleans up its own worker
});
