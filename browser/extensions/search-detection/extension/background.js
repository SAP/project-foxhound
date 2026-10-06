/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global browser */

// Telemetry values
const TELEMETRY_VALUE_EXTENSION = "extension";
const TELEMETRY_VALUE_SERVER = "server";

class AddonsSearchDetection {
  constructor() {
    /** @type {{baseUrl: string, addonId?: string, paramName?: string}[]} */
    this.engines = [];

    this.onRedirectedListener = this.onRedirectedListener.bind(this);
  }

  async getEngines() {
    try {
      this.engines = await browser.addonsSearchDetection.getEngines();
    } catch (err) {
      console.error(`failed to retrieve the list of URL patterns: ${err}`);
      this.engines = [];
    }

    return this.engines;
  }

  // When the search service changes the set of engines that are enabled, we
  // update our pattern matching in the webrequest listeners (go to the bottom
  // of this file for the search service events we listen to).
  async monitor() {
    // If there is already a listener, remove it so that we can re-add one
    // after. This is because we're using the same listener with different URL
    // patterns (when the list of search engines changes).
    if (
      browser.addonsSearchDetection.onRedirected.hasListener(
        this.onRedirectedListener
      )
    ) {
      browser.addonsSearchDetection.onRedirected.removeListener(
        this.onRedirectedListener
      );
    }

    // Retrieve the list of URL patterns to monitor with our listener.
    //
    // Note: search suggestions are system principal requests, so webRequest
    // cannot intercept them.
    const engines = await this.getEngines();
    const patterns = new Set(engines.map(e => e.baseUrl + "*"));

    if (patterns.size === 0) {
      return;
    }

    browser.addonsSearchDetection.onRedirected.addListener(
      this.onRedirectedListener,
      { urls: [...patterns] }
    );
  }

  async onRedirectedListener({ addonId, firstUrl, lastUrl }) {
    // When we do not have an add-on ID (in the request property bag), we
    // likely detected a search server-side redirect.
    const maybeServerSideRedirect = !addonId;

    // All engines that match the initial url.
    let engines = this.getEnginesForUrl(firstUrl);

    let addonIds = [];
    // Search server-side redirects are possible because an extension has
    // registered a search engine, which is why we can (hopefully) retrieve the
    // add-on ID.
    if (maybeServerSideRedirect) {
      addonIds = engines.filter(e => e.addonId).map(e => e.addonId);
    } else if (addonId) {
      addonIds = [addonId];
    }

    if (addonIds.length === 0) {
      // No add-on ID means there is nothing we can report.
      return;
    }

    // This is the monitored URL that was first redirected.
    const from = await browser.addonsSearchDetection.getPublicSuffix(firstUrl);
    // This is the final URL after redirect(s).
    const to = await browser.addonsSearchDetection.getPublicSuffix(lastUrl);

    let sameSite = from === to;
    let paramChanged = false;
    if (sameSite) {
      // We report redirects within the same site separately.

      // Known limitation: if a redirect chain starts and ends with the same
      // public suffix, it will still get reported as a same_site_redirect,
      // even if the chain contains different public suffixes in between.

      // Need special logic to detect changes to the query param named in `paramName`.
      let firstParams = new URLSearchParams(new URL(firstUrl).search);
      let lastParams = new URLSearchParams(new URL(lastUrl).search);
      for (let { paramName } of engines.filter(e => e.paramName)) {
        if (firstParams.get(paramName) !== lastParams.get(paramName)) {
          paramChanged = true;
          break;
        }
      }
    }

    for (const id of addonIds) {
      const addonVersion =
        await browser.addonsSearchDetection.getAddonVersion(id);
      const extra = {
        addonId: id,
        addonVersion,
        from,
        to,
        value: maybeServerSideRedirect
          ? TELEMETRY_VALUE_SERVER
          : TELEMETRY_VALUE_EXTENSION,
      };
      if (sameSite) {
        browser.addonsSearchDetection.reportSameSiteRedirect({
          addonId: id,
          addonVersion,
          origin: from,
          paramChanged,
        });
      } else if (maybeServerSideRedirect) {
        browser.addonsSearchDetection.reportETLDChangeOther(extra);
      } else {
        browser.addonsSearchDetection.reportETLDChangeWebrequest(extra);
      }
    }
  }

  getEnginesForUrl(url) {
    return this.engines.filter(e => url.startsWith(e.baseUrl));
  }
}

const exp = new AddonsSearchDetection();
exp.monitor();

browser.addonsSearchDetection.onSearchEngineModified.addListener(async () => {
  await exp.monitor();
});
