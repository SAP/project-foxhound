/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Formula from W3C's WCAG 2.0 spec's relative luminance, section 1.4.1,
 * http://www.w3.org/TR/WCAG20/.
 *
 * @return {number} Relative luminance, represented as number between 0 and 1.
 */
// Copied from Color.sys.mjs
function relativeLuminance(r, g, b) {
  let colorArr = [r, g, b].map(color => {
    if (color <= 10) {
      return color / 255 / 12.92;
    }
    return Math.pow((color / 255 + 0.055) / 1.055, 2.4);
  });
  return colorArr[0] * 0.2126 + colorArr[1] * 0.7152 + colorArr[2] * 0.0722;
}

/**
 * @function calculateTheme
 * @param {Window} win - Window to use for constructors
 * @param {Blob} blob - The image file blob to analyze.
 * @returns {Promise<"dark"|"light">} A promise that resolves to "dark" if the
 * average luminance is below the contrast threshold, otherwise "light".
 */
export async function calculateTheme(win, blob) {
  let totalLuminance = 0;
  let count = 0;
  // Create an offscreen image bitmap
  const bitmap = await win.createImageBitmap(blob);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // Draw to an off-screen canvas
  const canvas = new win.OffscreenCanvas(width, height);
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
        const luminance = relativeLuminance(red, green, blue);
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
