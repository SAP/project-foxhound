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
 * It expects you to pick a version large enough to contain your message.  Here
 * we search for the mimimum version based on the message length.
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
 * @returns {integer}
 */
function findMinimumVersion(message, errorCorrectionLevelChar) {
  const msgLength = message.length;
  const errorCorrectionLevel =
    lazy.QRErrorCorrectionLevel[errorCorrectionLevelChar];
  for (let version = 1; version <= 10; version++) {
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
 * @param {integer} version (optional)
 *   QR code "version" large enough to contain the message
 * @returns {object} An object with the following fields:
 *   src:    an image encoded as a data URI
 *   height: image height
 *   width:  image width
 */
function encodeToDataURI(message, errorCorrectionLevelChar, version) {
  errorCorrectionLevelChar = errorCorrectionLevelChar ?? "H";
  version = version ?? findMinimumVersion(message, errorCorrectionLevelChar);
  const encoder = new lazy.qrcode(version, errorCorrectionLevelChar);
  encoder.addData(message);
  encoder.make();

  const dataURI = encoder.createDataURL();
  const moduleCount = encoder.getModuleCount();
  const cellSize = 2;
  const margin = cellSize * 4;
  const size = moduleCount * cellSize + margin * 2;
  return {
    src: dataURI,
    width: size,
    height: size,
  };
}

export const QR = {
  encodeToDataURI,
};
