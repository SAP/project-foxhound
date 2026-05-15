/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * QRCodeWorker - Worker-based QR code generation
 *
 * This module provides a worker-based implementation for QR code generation
 * to avoid blocking the main thread during QR code processing.
 */

import { BasePromiseWorker } from "resource://gre/modules/PromiseWorker.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "logConsole", function () {
  return console.createInstance({
    prefix: "QRCodeWorker",
    maxLogLevel: Services.prefs.getBoolPref("browser.qrcode.log", false)
      ? "Debug"
      : "Warn",
  });
});

/**
 * Worker wrapper for QR code generation
 */
export class QRCodeWorker extends BasePromiseWorker {
  constructor() {
    super("moz-src:///browser/components/qrcode/QRCodeWorker.worker.mjs", {
      type: "module",
    });

    // Set up logging
    this.log = (...args) => lazy.logConsole.debug(...args);
  }

  /**
   * Simple ping test for worker communication
   *
   * @returns {Promise<string>} Returns "pong"
   */
  async ping() {
    return this.post("ping", []);
  }

  /**
   * Check if the QRCode library is available in the worker
   *
   * @returns {Promise<boolean>} True if library is available
   */
  async hasQRCodeLibrary() {
    return this.post("hasQRCodeLibrary", []);
  }

  /**
   * Generate a QR code for the given URL
   *
   * @param {string} url - The URL to encode in the QR code
   * @param {string} errorCorrectionLevel - Error correction level (L, M, Q, H)
   * @returns {Promise<object>} Object with width, height, and src data URI
   */
  async generateQRCode(url, errorCorrectionLevel = "H") {
    return this.post("generateQRCode", [url, errorCorrectionLevel]);
  }

  /**
   * Terminate the worker and clean up resources
   */
  async terminate() {
    super.terminate();
  }
}
