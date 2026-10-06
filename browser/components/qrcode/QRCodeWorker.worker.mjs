/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Now load the QRCode library with the full resource URI
import { QR } from "moz-src:///toolkit/components/qrcode/encoder.mjs";
import { PromiseWorker } from "resource://gre/modules/workers/PromiseWorker.mjs";

// Per ISO/IEC 18004, finder patterns are always 7x7 modules.
const FINDER_SIZE = 7;
const CELL_SIZE = 20;
// Per ISO/IEC 18004, the minimum quiet zone around the code is 4 modules.
const MARGIN_CELLS = 4;
// Dot radius as a fraction of cell size. 0.4 means dots are 80% of cell width,
// leaving a visible gap between adjacent dots.
const DOT_RADIUS_FACTOR = 0.4;
// Corner radius factors for finder pattern rounded rectangles (design choices).
const FINDER_OUTER_CORNER_RADIUS_FACTOR = 1.2;
const FINDER_INNER_CORNER_RADIUS_FACTOR = 0.6;
// Minimum logo size in QR modules - below this the logo is too small to recognize.
const MIN_LOGO_MODULE_SPAN = 6;
// Maximum logo size in QR modules - keeps the logo within the M-level error correction budget.
const MAX_LOGO_MODULE_SPAN = 8;

/**
 * QRCode Worker Implementation
 *
 * This worker handles QR code generation off the main thread.
 */
class QRCodeWorkerImpl {
  constructor() {
    this.#connectToPromiseWorker();
  }

  /**
   * @returns {number} Pixel margin around the QR code.
   */
  #getMargin() {
    return MARGIN_CELLS * CELL_SIZE;
  }

  /**
   * @param {number} dotCount - Number of modules per side.
   * @param {number} [margin] - Pixel margin; defaults to #getMargin().
   * @returns {number} Canvas side length in pixels.
   */
  #getCanvasSize(dotCount, margin = this.#getMargin()) {
    return dotCount * CELL_SIZE + margin * 2;
  }

  /**
   * Returns the top-left [row, col] of each of the three finder patterns.
   *
   * @param {number} dotCount
   * @returns {number[][]}
   */
  #getFinderPatternOrigins(dotCount) {
    return [
      [0, 0],
      [0, dotCount - FINDER_SIZE],
      [dotCount - FINDER_SIZE, 0],
    ];
  }

  /**
   * Calls callback(dotX, dotY) for every dark module that should be drawn as a
   * dot — skipping finder-pattern corners and any module suppressed by the logo.
   *
   * @param {boolean[][]} matrix
   * @param {object} placement - Logo placement descriptor from getLogoPlacement.
   * @param {number} margin - Pixel margin.
   * @param {Function} callback
   */
  #forEachVisibleDarkModule(matrix, placement, margin, callback) {
    const dotCount = matrix.length;
    const isInFinderPatternCorners = (row, col) =>
      (row < FINDER_SIZE && col < FINDER_SIZE) ||
      (row < FINDER_SIZE && col >= dotCount - FINDER_SIZE) ||
      (row >= dotCount - FINDER_SIZE && col < FINDER_SIZE);

    for (let row = 0; row < dotCount; row++) {
      for (let col = 0; col < dotCount; col++) {
        if (isInFinderPatternCorners(row, col) || !matrix[row][col]) {
          continue;
        }
        const dotX = margin + (col + 0.5) * CELL_SIZE;
        const dotY = margin + (row + 0.5) * CELL_SIZE;
        const offsetX = dotX - placement.centerX;
        const offsetY = dotY - placement.centerY;
        if (
          placement.showLogo &&
          Math.hypot(offsetX, offsetY) <
            placement.clearRadius + CELL_SIZE * DOT_RADIUS_FACTOR
        ) {
          continue;
        }
        callback(dotX, dotY);
      }
    }
  }

  /**
   * Draws a single rounded-rectangle finder pattern at canvas position (x, y).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Left edge in pixels.
   * @param {number} y - Top edge in pixels.
   */
  #drawFinderPattern(ctx, x, y) {
    // Finder pattern: 7×7 outer square, 5×5 white ring (inset 1 module each side),
    // 3×3 black center (inset 1 more module each side).
    const outerSize = FINDER_SIZE * CELL_SIZE;
    const ringSize = (FINDER_SIZE - 2) * CELL_SIZE;
    const centerSize = (FINDER_SIZE - 4) * CELL_SIZE;
    const outerR = CELL_SIZE * FINDER_OUTER_CORNER_RADIUS_FACTOR;
    const innerR = CELL_SIZE * FINDER_INNER_CORNER_RADIUS_FACTOR;

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.roundRect(x, y, outerSize, outerSize, outerR);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(x + CELL_SIZE, y + CELL_SIZE, ringSize, ringSize, innerR);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.roundRect(
      x + 2 * CELL_SIZE,
      y + 2 * CELL_SIZE,
      centerSize,
      centerSize,
      innerR
    );
    ctx.fill();
  }

  /**
   * Fills ctx with the white background, draws all data dots, and draws the
   * three finder patterns.
   *
   * @param {OffscreenCanvasRenderingContext2D} ctx
   * @param {boolean[][]} matrix
   * @param {object} placement - Logo placement descriptor from getLogoPlacement.
   * @param {number} [margin]
   */
  #drawQRBodyToCanvas(ctx, matrix, placement, margin = this.#getMargin()) {
    const dotCount = matrix.length;
    const canvasSize = this.#getCanvasSize(dotCount, margin);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    ctx.fillStyle = "black";
    this.#forEachVisibleDarkModule(matrix, placement, margin, (dotX, dotY) => {
      ctx.beginPath();
      ctx.arc(dotX, dotY, CELL_SIZE * DOT_RADIUS_FACTOR, 0, Math.PI * 2);
      ctx.fill();
    });

    for (const [startRow, startCol] of this.#getFinderPatternOrigins(
      dotCount
    )) {
      const x = margin + startCol * CELL_SIZE;
      const y = margin + startRow * CELL_SIZE;
      this.#drawFinderPattern(ctx, x, y);
    }
  }

  /**
   * Returns the preferred logo size capped at MAX_LOGO_MODULE_SPAN modules.
   *
   * @param {number} canvasSize - Canvas side length in pixels.
   * @returns {number} Logo size in pixels.
   */
  #getPreferredLogoSize(canvasSize) {
    // 18% of canvas width is a design choice: large enough to be recognizable
    // without exceeding the M-level error correction budget.
    const desiredLogoSize = Math.round(canvasSize * 0.18);
    return Math.min(desiredLogoSize, MAX_LOGO_MODULE_SPAN * CELL_SIZE);
  }

  /**
   * @param {string} url
   * @returns {{ matrix: boolean[][], dotCount: number }}
   */
  generateQRMatrix(url) {
    if (!QR || !QR.encodeToMatrix) {
      throw new Error("QRCode library not available in worker");
    }
    const { matrix, dotCount } = QR.encodeToMatrix(url, "M");
    return { matrix, dotCount };
  }

  /**
   * Returns the logo placement, always centered on the canvas. Modules under
   * the logo are cleared at draw time; M-level error correction absorbs the
   * loss.
   *
   * @param {number} dotCount
   * @param {number} [margin]
   * @returns {object} Logo placement descriptor.
   */
  getLogoPlacement(dotCount, margin = this.#getMargin()) {
    const canvasSize = this.#getCanvasSize(dotCount, margin);
    const preferredLogoSize = this.#getPreferredLogoSize(canvasSize);
    const minimumLogoSize = MIN_LOGO_MODULE_SPAN * CELL_SIZE;
    const logoSize = Math.max(preferredLogoSize, minimumLogoSize);

    return {
      centerX: canvasSize / 2,
      centerY: canvasSize / 2,
      clearRadius: logoSize / 2,
      logoSize,
      showLogo: true,
    };
  }

  /**
   * Generate a complete QR code PNG with the Firefox logo composited in the
   * worker. Returns a data URI ready for display or saving.
   *
   * Defaults to M-level error correction (matching Chrome): denser modules
   * than H, with enough headroom for the centered logo. Falls back to L for
   * URLs that don't fit at M, hiding the logo since L's ~7% error-correction
   * budget is too narrow to spare.
   *
   * @param {string} url
   * @param {boolean} [showLogo=true]
   * @returns {Promise<string>} data:image/png;base64,... URI
   */
  async generateFullQRCode(url, showLogo = true) {
    let matrix, dotCount, ecLevel;
    for (const level of ["M", "L"]) {
      try {
        ({ matrix, dotCount } = QR.encodeToMatrix(url, level));
        ecLevel = level;
        break;
      } catch (e) {
        if (level === "L") {
          throw e;
        }
      }
    }
    const margin = this.#getMargin();
    const placement = this.getLogoPlacement(dotCount, margin);
    if (ecLevel !== "M" || !showLogo) {
      placement.showLogo = false;
    }
    const size = this.#getCanvasSize(dotCount, margin);

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");

    this.#drawQRBodyToCanvas(ctx, matrix, placement, margin);

    if (placement.showLogo) {
      try {
        const response = await fetch(
          "chrome://branding/content/about-logo@2x.png"
        );
        if (!response.ok) {
          throw new Error(`Logo fetch failed: ${response.status}`);
        }
        const blob = await response.blob();
        const logoSize = Math.round(placement.logoSize);
        const logoBitmap = await globalThis.createImageBitmap(blob, {
          resizeWidth: logoSize,
          resizeHeight: logoSize,
          resizeQuality: "high",
        });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          logoBitmap,
          placement.centerX - placement.logoSize / 2,
          placement.centerY - placement.logoSize / 2,
          placement.logoSize,
          placement.logoSize
        );
        logoBitmap.close();
      } catch (e) {
        // Workers don't have access to the main-thread lazy.logConsole, so
        // log directly via console.
        console.warn("Failed to load Firefox logo for QR code:", e);
      }
    }

    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    const arrayBuffer = await pngBlob.arrayBuffer();
    const base64 = new Uint8Array(arrayBuffer).toBase64();
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Glue code to connect the `QRCodeWorkerImpl` to the PromiseWorker interface.
   */
  #connectToPromiseWorker() {
    const worker = new PromiseWorker.AbstractWorker();

    worker.dispatch = (method, args = []) => {
      if (!this[method]) {
        throw new Error("Method does not exist: " + method);
      }
      return this[method](...args);
    };

    worker.close = () => self.close();

    worker.postMessage = (message, ...transfers) => {
      self.postMessage(message, ...transfers);
    };

    self.addEventListener("message", msg => worker.handleMessage(msg));
    self.addEventListener("unhandledrejection", function (error) {
      throw error.reason;
    });
  }
}

// Create the worker instance
new QRCodeWorkerImpl();
