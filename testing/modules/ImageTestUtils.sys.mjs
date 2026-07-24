/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provides testing functions working with images and image URLs.
 */

import { Assert } from "resource://testing-common/Assert.sys.mjs";

export const ImageTestUtils = {
  /**
   * Assert that both provided image URLs are visually identical.
   */
  async assertEqualImage(win, first, second, msg) {
    const firstCanvas = await this.drawImageOnCanvas(win, first);
    const secondCanvas = await this.drawImageOnCanvas(win, second);

    Assert.equal(
      firstCanvas.width,
      secondCanvas.width,
      `${msg} - Both images have the same width`
    );
    Assert.equal(
      firstCanvas.height,
      secondCanvas.height,
      `${msg} - Both images have the same height`
    );

    const differences = win.windowUtils.compareCanvases(
      firstCanvas,
      secondCanvas,
      {}
    );
    Assert.equal(differences, 0, `${msg} - Both images are identical`);
  },

  drawImageOnCanvas(win, url) {
    return new Promise((resolve, reject) => {
      const img = new win.Image();

      img.onload = function () {
        // TODO: compareCanvases only works for the HTMLCanvasElement.
        const canvas = win.document.createElementNS(
          "http://www.w3.org/1999/xhtml",
          "canvas"
        );
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve(canvas);
      };

      img.onerror = function () {
        reject(`error loading image ${url}`);
      };

      // Load the src image for drawing
      img.src = url;
    });
  },
};
