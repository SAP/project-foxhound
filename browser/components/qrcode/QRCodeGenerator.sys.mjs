/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * QR Code Generator with Firefox logo overlay
 * This module generates QR codes with the Firefox logo in the center
 * Uses a worker thread for QR generation to avoid blocking the main thread
 */

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "logConsole", function () {
  return console.createInstance({
    prefix: "QRCodeGenerator",
    maxLogLevel: Services.prefs.getBoolPref("browser.qrcode.log", false)
      ? "Debug"
      : "Warn",
  });
});

ChromeUtils.defineESModuleGetters(lazy, {
  QRCodeWorker: "moz-src:///browser/components/qrcode/QRCodeWorker.sys.mjs",
});

export const QRCodeGenerator = {
  /**
   * Generate a QR code for the given URL with Firefox logo overlay
   *
   * @param {string} url - The URL to encode
   * @param {Document} document - The document to use for creating elements
   * @returns {Promise<string>} - Data URI of the QR code with logo
   */
  async generateQRCode(url, document) {
    // Create a fresh worker for this generation
    // Worker will be terminated after use to free resources
    const worker = new lazy.QRCodeWorker();

    try {
      // Generate the base QR code with high error correction to allow for logo overlay
      // Use worker thread to avoid blocking main thread
      const qrData = await worker.generateQRCode(url, "H");

      // Use a higher resolution for better quality (scale up 4x)
      const scale = 4;
      const canvas = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "canvas"
      );
      canvas.width = qrData.width * scale;
      canvas.height = qrData.height * scale;
      const ctx = canvas.getContext("2d");

      // Disable image smoothing for crisp QR code rendering
      ctx.imageSmoothingEnabled = false;

      // Load and draw the base QR code at high resolution
      const qrImage = await this._loadImage(document, qrData.src);
      ctx.drawImage(qrImage, 0, 0, qrData.width * scale, qrData.height * scale);

      // Calculate logo size and position (center of QR code)
      // Use 18% of QR code size (reduced from 25%) to stay within error correction limits
      const logoSize = Math.floor(qrData.width * 0.18) * scale;
      const centerX = Math.floor((qrData.width * scale) / 2);
      const centerY = Math.floor((qrData.height * scale) / 2);

      // Draw circular white background for logo with minimal padding
      const padding = 4 * scale;
      const radius = (logoSize + padding * 2) / 2;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Load and draw the Firefox logo at high resolution
      try {
        const logoImage = await this._loadFirefoxLogo(document);
        // Re-enable smoothing for the logo to avoid pixelation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw logo centered
        const logoX = centerX - logoSize / 2;
        const logoY = centerY - logoSize / 2;
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        lazy.logConsole.warn("Could not load Firefox logo for QR code:", e);
      }

      // Convert canvas to data URI
      return canvas.toDataURL("image/png");
    } finally {
      // Always terminate the worker to free resources
      try {
        await worker.terminate();
        lazy.logConsole.debug("QRCode worker terminated successfully");
      } catch (e) {
        lazy.logConsole.warn("Failed to terminate QRCode worker:", e);
      }
    }
  },

  /**
   * Load an image from a URL/data URI
   *
   * @param {Document} document - The document to use for creating the image
   * @param {string} src - The image source
   * @returns {Promise<HTMLImageElement>}
   */
  _loadImage(document, src) {
    return new Promise((resolve, reject) => {
      const img = document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "img"
      );
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  /**
   * Load the Firefox logo
   *
   * @param {Document} document - The document to use for creating the image
   * @returns {Promise<HTMLImageElement>}
   */
  async _loadFirefoxLogo(document) {
    // Use the Firefox branding logo
    return this._loadImage(
      document,
      "chrome://branding/content/about-logo.svg"
    );
  },
};
