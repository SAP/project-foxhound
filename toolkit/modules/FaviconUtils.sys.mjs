/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TYPE_ICO = "image/x-icon";
const TYPE_SVG = "image/svg+xml";

export { TYPE_ICO, TYPE_SVG };

// SVG images are send as raw data URLs from the content process to the parent.
// The raw data: URL should NOT be used directly when displaying, but instead wrapped with a moz-remote-image: for safe re-encoding!
export const SVG_DATA_URI_PREFIX = `data:${TYPE_SVG};base64,`;

// URL schemes that we don't want to load and convert to data URLs.
export const TRUSTED_FAVICON_SCHEMES = Object.freeze([
  "chrome",
  "about",
  "resource",
]);

/**
 * Creates a moz-remote-image: URL wrapping the specified URL.
 *
 * @param {string} url The URL to (remotely) load the image from.
 * @param {object} options Further configuration options for loading.
 * @param {number} options.size The size of the final image. Should be > 0.
 * @param {string} options.colorScheme Either "dark" or "light". Used for SVGs.
 * @param {number} options.contentParentId Which process to render the image in.
 */
function getMozRemoteImageURL(url, options = {}) {
  if (options.size !== undefined) {
    options.height = options.width = options.size;
    delete options.size;
  }

  let params = new URLSearchParams({
    url,
    ...options,
  });
  return "moz-remote-image://?" + params;
}

export { getMozRemoteImageURL };

/**
 * Converts a Blob into a data: URL.
 *
 * @param {Blob} blob The Blob to be converted.
 * @returns {Promise<string>} Returns a promise that resolves with the data: URL
 *                            or rejects with an error.
 */
export function blobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

// Shim for tabbrowser.js that uses `defineESModuleGetters`.
export let FaviconUtils = {
  SVG_DATA_URI_PREFIX,
  getMozRemoteImageURL,
};
