/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * @import { HiddenFrame } from "resource://gre/modules/HiddenFrame.sys.mjs"
 * @import { GetTextOptions, ExtractionResult } from './PageExtractor.d.ts'
 * @import { PageExtractorChild } from './PageExtractorChild.sys.mjs'
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  HiddenBrowserManager: "resource://gre/modules/HiddenFrame.sys.mjs",
  console: () =>
    console.createInstance({
      prefix: "PageExtractorChild",
      maxLogLevelPref: "browser.ml.logLevel",
    }),
});

/**
 * Extract a variety of content from pages for use in a smart window.
 */
export class PageExtractorParent extends JSWindowActorParent {
  /**
   * Returns ReaderMode content when the page passes the `isProbablyReaderable` check.
   * The check can be bypassed to force page content to be retrieved by setting `force`
   * to true.
   *
   * @see PageExtractorChild#getReaderModeContent
   *
   * @param {boolean} force - Bypass the `isProbablyReaderable` check.
   * @returns {Promise<ExtractionResult>}
   */
  getReaderModeContent(force = false) {
    return this.sendQuery("PageExtractorParent:GetReaderModeContent", force);
  }

  /**
   * Waits for DOMContentLoaded.
   *
   * @see PageExtractorChild#waitForPageReady
   * @returns {Promise<void>}
   */
  waitForPageReady() {
    return this.sendQuery("PageExtractorParent:WaitForPageReady");
  }

  /**
   * Gets the visible text from the page. This function is a bit smarter than just
   * document.body.innerText. See GetTextOptions
   *
   * @see PageExtractorChild#getText
   *
   * @param {Partial<GetTextOptions>} options
   * @returns {Promise<ExtractionResult>}
   */
  async getText(options = {}) {
    if (this.#isPDF()) {
      const text = await this.browsingContext.currentWindowGlobal
        .getActor("Pdfjs")
        .getTextContent();
      return { text, links: [], canvasSnapshots: [] };
    }
    return this.sendQuery("PageExtractorParent:GetText", options);
  }

  #isPDF() {
    return (
      this.browsingContext.currentWindowGlobal.documentPrincipal
        .originNoSuffix == "resource://pdf.js"
    );
  }

  /**
   * Get a Headless PageExtractor. It is available until the callback's returned
   * Promise is resolved. Then the headless browser is cleaned up.
   *
   * @see PageExtractorChild#getText
   *
   * @template T - The value resolved in the callback.
   *
   * @param {string} urlString
   * @param {(actor: PageExtractorParent) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  static async getHeadlessExtractor(urlString, callback) {
    const url = URL.parse(urlString);
    if (!url) {
      throw new Error("A valid URL must be provided.");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only http: and https: URLs are supported.");
    }
    // The hidden browser manager controls the lifetime of the hidden browser.
    return lazy.HiddenBrowserManager.withHiddenBrowser(async browser => {
      const { host } = url;
      // Create a custom message manager group for this browser so that the PageExtractor
      // actor can communicate with it. The actor is registered to use this custom
      // message manager group.
      browser.setAttribute("messagemanagergroup", "headless-browsers");

      /** @type {PromiseWithResolvers<PageExtractorParent>} */
      let actorResolver = Promise.withResolvers();

      const locationChangeFlags = Ci.nsIWebProgress.NOTIFY_LOCATION;
      const onLocationChange = {
        QueryInterface: ChromeUtils.generateQI([
          "nsIWebProgressListener",
          "nsISupportsWeakReference",
        ]),
        /**
         * @param {nsIWebProgress} webProgress
         * @param {nsIRequest} _request
         * @param {nsIURI} location
         * @param {number} _flags
         */
        onLocationChange(webProgress, _request, location, _flags) {
          if (!webProgress.isTopLevel) {
            lazy.console.log(
              "Headless browser had a non-top level location change."
            );
            return;
          }
          if (location.spec == "about:blank") {
            // about:blank is loaded first before loading the actual page.
            return;
          }
          if (URL.fromURI(location).host != host) {
            lazy.console.log(
              "A location change happened that wasn't the host.",
              location.host,
              host
            );
            // This is probably overkill, but make sure this is not a spurious
            // redirect.
            return;
          }
          browser.removeProgressListener(onLocationChange, locationChangeFlags);

          /** @type {any} - This is reported as an `Element`, but it's a <browser> */
          const topBrowser = webProgress.browsingContext.topFrameElement;

          try {
            const actor =
              topBrowser.browsingContext.currentWindowGlobal.getActor(
                "PageExtractor"
              );

            actor.waitForPageReady().then(() => {
              lazy.console.log("Headless PageExtractor is ready", url);
              actorResolver.resolve(actor);
            });
          } catch (error) {
            // TODO (Bug 2001385) - It would be nice to catch if this is the
            // `about:neterror` page or other similar errors. This will also fail if you
            // try to access something like `about:reader` with the same error.
            actorResolver.reject(
              new Error(
                "PageExtractor could not run on that page or the page could not be found."
              )
            );
          }
        },
      };

      browser.addProgressListener(onLocationChange, locationChangeFlags);

      lazy.console.log("Loading a headless PageExtractor", url);

      browser.loadURI(url.URI, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });

      return callback(await actorResolver.promise);
    });
  }
}
