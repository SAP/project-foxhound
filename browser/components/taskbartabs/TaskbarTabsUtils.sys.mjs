/* vim: se cin sw=2 ts=2 et filetype=javascript :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

let lazy = {};

XPCOMUtils.defineLazyServiceGetters(lazy, {
  Favicons: ["@mozilla.org/browser/favicon-service;1", Ci.nsIFaviconService],
});

export const TaskbarTabsUtils = {
  /**
   * Checks if Taskbar Tabs has been enabled.
   *
   * @returns {bool} `true` if the Taskbar Tabs pref is enabled.
   */
  isEnabled() {
    const pref = "browser.taskbarTabs.enabled";
    return Services.prefs.getBoolPref(pref, false);
  },

  /**
   * Returns a folder to store profile-specific Taskbar Tabs files.
   *
   * @returns {nsIFile} Folder to store Taskbar Tabs files.
   */
  getTaskbarTabsFolder() {
    // Construct the path `[Profile]/taskbartabs/`.
    let folder = Services.dirsvc.get("ProfD", Ci.nsIFile);
    folder.append("taskbartabs");
    return folder;
  },

  /**
   * Checks if the window is a Taskbar Tabs window.
   *
   * @param {Window} aWin - The window to inspect.
   * @returns {bool} true if the window is a Taskbar Tabs window.
   */
  isTaskbarTabWindow(aWin) {
    return aWin.document.documentElement.hasAttribute("taskbartab");
  },

  /**
   * Retrieves the Taskbar Tabs ID for the window.
   *
   * @param {DOMWindow} aWin - The window to retrieve the Taskbar Tabs ID.
   * @returns {string} The Taskbar Tabs ID for the window.
   */
  getTaskbarTabIdFromWindow(aWin) {
    return aWin.document.documentElement.getAttribute("taskbartab");
  },

  /**
   * Retrieves an image container for the provided URL. May throw if an error
   * occurs while decoding.
   *
   * Raster images will be scaled to 256x256 pixels.
   *
   * @param {nsIURI} aUri - The URI to parse the image from. Must be a local
   * URI, like data:, chrome:, or file:.
   * @returns {imgIContainer} A container of the icon retrieved, or the
   * default favicon.
   * @throws {TypeError} aUri is not an nsIURI.
   * @throws {Error} aUri is not a local URI.
   * @throws {Components.Exception} The image could not be decoded.
   */
  async _imageFromLocalURI(aUri) {
    if (!(aUri instanceof Ci.nsIURI)) {
      throw new TypeError(
        "Invalid argument, `aUri` should be instance of `nsIURI`"
      );
    }

    const protocolFlags = Services.io.getProtocolFlags(aUri.scheme);
    if (!(protocolFlags & Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE)) {
      throw new Error("Attempting to create an image from a non-local URI");
    }

    const channel = Services.io.newChannelFromURI(
      aUri,
      null,
      Services.scriptSecurityManager.getSystemPrincipal(),
      null,
      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      Ci.nsIContentPolicy.TYPE_IMAGE
    );

    return ChromeUtils.fetchDecodedImage(aUri, channel);
  },

  /**
   * Gets the favicon for aUri as a data URI.
   *
   * @param {nsIURI} aUri - The URI to look up the favicon for.
   * @returns {nsIURI} The data URI of the favicon.
   */
  async getFaviconUri(aUri) {
    let favicon = await lazy.Favicons.getFaviconForPage(aUri);
    return favicon?.dataURI;
  },

  /**
   * Gets the default favicon as an imgIContainer. This icon is used if no
   * other icons are available.
   *
   * @returns {imgIContainer} The default favicon.
   */
  async getDefaultIcon() {
    return await TaskbarTabsUtils._imageFromLocalURI(
      lazy.Favicons.defaultFavicon
    );
  },
};
