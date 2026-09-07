/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals browser, embedHelperLib */

if (!window.smartblockDisqusShimInitialized) {
  // Guard against this script running multiple times
  window.smartblockDisqusShimInitialized = true;

  /**
   * Finds a Disqus embed script URL in the document. Validates that
   * the URL matches https://*.disqus.com/embed.js format.
   *
   * @returns {string|undefined} The script URL if found, undefined otherwise.
   */
  function getDisqusEmbedScriptURL() {
    for (const script of document.querySelectorAll("script[src]")) {
      try {
        const url = new URL(script.src);
        if (
          url.protocol === "https:" &&
          url.hostname.endsWith(".disqus.com") &&
          url.pathname === "/embed.js"
        ) {
          return url.href;
        }
      } catch {
        // Invalid URL, skip
      }
    }
    return undefined;
  }

  // Get the script URL from the page. We can't hardcode it because the
  // subdomain is site specific.
  const scriptURL = getDisqusEmbedScriptURL();
  if (scriptURL) {
    embedHelperLib.initEmbedShim({
      shimId: "DisqusEmbed",
      scriptURL,
      embedLogoURL: "https://smartblock.firefox.etp/disqus.svg",
      embedSelector: "#disqus_thread",
      isTestShim: false,
    });
  }
}
