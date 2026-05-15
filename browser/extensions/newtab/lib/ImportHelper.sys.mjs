/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export let ImportHelper = {
  /**
   * Helper so the new tab extension can easily trainhop while we convert
   * modules from resource:// to moz-src:// URIs.
   *
   * @param {string} module
   *   The full moz-src URI to import.
   * @param {string} [fallbackResourcePath ="resource://gre/modules/"]
   *   The resource url prefix to use for fallback import if moz-src fails.
   *   The helper will suffix _only_ the module filename to this path.
   */
  import(module, fallbackResourcePath = "resource://gre/modules/") {
    try {
      return ChromeUtils.importESModule(module);
    } catch {
      let baseName = module.split("/").pop();
      // Fallback to a resource URI if moz-src fails.
      return ChromeUtils.importESModule(fallbackResourcePath + baseName);
    }
  },
};
