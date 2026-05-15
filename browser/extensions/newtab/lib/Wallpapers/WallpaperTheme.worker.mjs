/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line mozilla/reject-import-system-module-from-non-system
import { Color } from "resource://gre/modules/Color.sys.mjs";
import { PromiseWorker } from "resource://gre/modules/workers/PromiseWorker.mjs";

/**
 * Worker for calculating the average relative luminance of an image
 * off the main thread.
 */
export class WallpaperThemeWorker {
  /**
   * @function calculateTheme
   * @param {{ blob: Blob }} options - Options object containing the image blob.
   * @param {Blob} options.blob - The image file blob to analyze.
   * @returns {Promise<"dark"|"light">} A promise that resolves to "dark" if the
   * average luminance is below the contrast threshold, otherwise "light".
   */
  async calculateTheme(blob) {
    let totalLuminance = 0;
    let count = 0;
    // Create an offscreen image bitmap
    const bitmap = await globalThis.createImageBitmap(blob);
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    // Draw to an off-screen canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    // get pixel data
    const { data } = ctx.getImageData(0, 0, width, height);

    // The +=1 in these loops means that it will look at every pixel
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const index = (row * width + column) * 4;
        const alpha = data[index + 3];
        // Skip transparent pixels
        if (alpha > 0) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const luminance = new Color(red, green, blue).relativeLuminance;
          totalLuminance += luminance;
          count++;
        }
      }
    }
    const averageLuminance = totalLuminance / count;

    // Threshold taken from Color.sys.mjs module
    const CONTRAST_BRIGHTTEXT_THRESHOLD = Math.sqrt(1.05 * 0.05) - 0.05;
    return averageLuminance <= CONTRAST_BRIGHTTEXT_THRESHOLD ? "dark" : "light";
  }
}

// Promise worker boiler plate
const wallpaperWorker = new WallpaperThemeWorker();
const worker = new PromiseWorker.AbstractWorker();
worker.dispatch = function (method, args = []) {
  return wallpaperWorker[method](...args);
};
worker.postMessage = function (message, ...transfers) {
  self.postMessage(message, ...transfers);
};
worker.close = function () {
  self.close();
};
self.addEventListener("message", msg => worker.handleMessage(msg));
self.addEventListener("unhandledrejection", function (error) {
  throw error.reason;
});
