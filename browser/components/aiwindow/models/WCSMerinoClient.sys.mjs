/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Small client for the Merino World Cup Soccer endpoints.
 *
 * Lives alongside the Smart Window tool that consumes it. Intentionally
 * kept independent of newtab's TemporaryMerinoClientShim, which is shaped
 * around `/api/v1/suggest` semantics that don't match the WCS responses.
 */

const ENDPOINT_PREF = "browser.smartwindow.worldcup.endpointURL";
const TIMEOUT_PREF = "browser.smartwindow.worldcup.timeoutMs";
const DEFAULT_ENDPOINT = "https://merino.services.mozilla.com";
const DEFAULT_TIMEOUT_MS = 2000;

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});
ChromeUtils.defineLazyGetter(lazy, "console", () =>
  console.createInstance({
    prefix: "WCSMerinoClient",
    maxLogLevelPref: "browser.smartwindow.conversation.logLevel",
  })
);

/**
 * Static client for the Merino World Cup Soccer endpoints.
 */
export class WCSMerinoClient {
  /**
   * Fetch World Cup matches in a +/- 7 day window around `date`.
   *
   * @param {object} [params]
   * @param {string} [params.date]   RFC date YYYY-MM-DD; server defaults to today UTC.
   * @param {string} [params.teams]  Comma-separated 3-letter team keys, e.g. "BRA,ARG".
   * @param {number} [params.limit]  Max matches to return.
   * @returns {Promise<{previous: object[], current: object[], next: object[]}>}
   */
  static fetchMatches(params = {}) {
    return WCSMerinoClient.#get("/api/v1/wcs/matches", params);
  }

  /**
   * Fetch World Cup matches currently in progress.
   *
   * @param {object} [params]
   * @param {string} [params.teams]  Comma-separated 3-letter team keys.
   * @returns {Promise<{matches: object[]}>}
   */
  static fetchLive(params = {}) {
    return WCSMerinoClient.#get("/api/v1/wcs/live", params);
  }

  static #endpointBase() {
    return Services.prefs.getStringPref(ENDPOINT_PREF, DEFAULT_ENDPOINT);
  }

  static #timeoutMs() {
    return Services.prefs.getIntPref(TIMEOUT_PREF, DEFAULT_TIMEOUT_MS);
  }

  static async #get(path, params) {
    const url = new URL(path, WCSMerinoClient.#endpointBase());
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timer = lazy.setTimeout(
      () => controller.abort(),
      WCSMerinoClient.#timeoutMs()
    );

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        credentials: "omit",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lazy.console.warn(`WCS request to ${path} failed:`, error);
      throw error;
    } finally {
      lazy.clearTimeout(timer);
    }
  }
}
