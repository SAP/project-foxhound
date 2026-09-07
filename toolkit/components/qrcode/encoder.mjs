/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(
  lazy,
  {
    qrcode: "moz-src:///third_party/js/qrcode/qrcode.mjs",
    QRErrorCorrectionLevel: "moz-src:///third_party/js/qrcode/qrcode.mjs",
    QRRSBlock: "moz-src:///third_party/js/qrcode/qrcode.mjs",
  },
  { global: "current" }
);

/**
 * There are many "versions" of QR codes, which describes how many dots appear
 * in the resulting image, thus limiting the amount of data that can be
 * represented.
 *
 * We need to pick a version large enough to contain our message. Here we
 * search for the minimum version based on the message length.
 *
 * @param {string} message
 *   Text to encode
 * @param {string} errorCorrectionLevelChar
 *   The higher the error correction level, the less the storage capacity, but
 *   the greater probability of successful data retrieval on the resulting
 *   QR Code if it's damaged or obscured.
 *
 *   The errorCorrectionLevelChar must be one of:
 *     - "L" (low error correction)
 *     - "M" (medium error correction)
 *     - "Q" (quartile error correction)
 *     - "H" (high error correction)
 * @returns {number}
 */
function findMinimumVersion(message, errorCorrectionLevelChar) {
  const msgLength = message.length;
  const errorCorrectionLevel =
    lazy.QRErrorCorrectionLevel[errorCorrectionLevelChar];
  for (let version = 1; version <= 40; version++) {
    const rsBlocks = lazy.QRRSBlock.getRSBlocks(version, errorCorrectionLevel);
    let maxLength = rsBlocks.reduce((prev, block) => {
      return prev + block.dataCount;
    }, 0);
    // Remove two bytes to fit header info
    maxLength -= 2;
    if (msgLength <= maxLength) {
      return version;
    }
  }
  throw new Error("Message too large");
}

/**
 * Build and populate a QR encoder for the requested message.
 *
 * @param {string} message
 *   Text to encode
 * @param {string} [errorCorrectionLevelChar="H"]
 *   Error correction level to use ("L", "M", "Q", or "H")
 * @param {number} [version]
 *   QR code version large enough to contain the message
 * @returns {object}
 */
function createEncoder(message, errorCorrectionLevelChar, version) {
  const levelChar = errorCorrectionLevelChar ?? "H";
  const qrVersion = version ?? findMinimumVersion(message, levelChar);
  const encoder = new lazy.qrcode(qrVersion, levelChar);
  encoder.addData(message);
  encoder.make();
  return encoder;
}

/**
 * Simple wrapper around the underlying encoder's API.
 *
 * @param {string} message
 *   Text to encode
 * @param {string} [errorCorrectionLevelChar="H"]
 *   The higher the error correction level, the less the storage capacity, but
 *   the greater probability of successful data retrieval on the resulting
 *   QR Code if it's damaged or obscured.
 *
 *   The errorCorrectionLevelChar must be one of:
 *     - "L" (low error correction)
 *     - "M" (medium error correction)
 *     - "Q" (quartile error correction)
 *     - "H" (high error correction)
 * @param {number} [version]
 *   QR code "version" large enough to contain the message
 * @returns {object} An object with the following fields:
 *   src:    an image encoded as a data URI
 *   height: image height
 *   width:  image width
 */
function encodeToDataURI(message, errorCorrectionLevelChar, version) {
  const encoder = createEncoder(message, errorCorrectionLevelChar, version);
  const dataURI = encoder.createDataURL();
  const dotCount = encoder.getModuleCount();
  const cellSize = 2;
  const margin = cellSize * 4;
  const size = dotCount * cellSize + margin * 2;
  return { src: dataURI, width: size, height: size };
}

/**
 * Return the QR dot matrix without generating a raster image.
 *
 * @param {string} message
 *   Text to encode
 * @param {string} [errorCorrectionLevelChar="H"]
 *   Error correction level to use ("L", "M", "Q", or "H")
 * @param {number} [version]
 *   QR code "version" large enough to contain the message
 * @returns {object} An object with the following fields:
 *   matrix:   boolean[][] of dark dots
 *   dotCount: number of dots per side
 */
function encodeToMatrix(message, errorCorrectionLevelChar, version) {
  const encoder = createEncoder(message, errorCorrectionLevelChar, version);
  const dotCount = encoder.getModuleCount();
  const matrix = [];
  for (let row = 0; row < dotCount; row++) {
    matrix[row] = [];
    for (let col = 0; col < dotCount; col++) {
      matrix[row][col] = encoder.isDark(row, col);
    }
  }
  return { matrix, dotCount };
}

export const QR = {
  encodeToDataURI,
  encodeToMatrix,
};
