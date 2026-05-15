/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that offers restrict keywords for search mode.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
  UrlbarTokenizer:
    "moz-src:///browser/components/urlbar/UrlbarTokenizer.sys.mjs",
});

const RESTRICT_KEYWORDS_FEATURE_GATE = "searchRestrictKeywords.featureGate";

/**
 * Class used to create the provider.
 */
export class UrlbarProviderRestrictKeywords extends UrlbarProvider {
  constructor() {
    super();
  }

  /**
   * @returns {Values<typeof UrlbarUtils.PROVIDER_TYPE>}
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.HEURISTIC;
  }

  getPriority() {
    return 1;
  }

  async isActive(queryContext) {
    if (!lazy.UrlbarPrefs.getScotchBonnetPref(RESTRICT_KEYWORDS_FEATURE_GATE)) {
      return false;
    }

    return !queryContext.searchMode && queryContext.trimmedSearchString == "@";
  }

  /**
   * Starts querying.
   *
   * @param {UrlbarQueryContext} queryContext
   * @param {(provider: UrlbarProvider, result: UrlbarResult) => void} addCallback
   *   Callback invoked by the provider to add a new result.
   */
  async startQuery(queryContext, addCallback) {
    let instance = this.queryInstance;
    let tokenToKeyword = await lazy.UrlbarTokenizer.getL10nRestrictKeywords();

    if (instance != this.queryInstance) {
      return;
    }

    for (const [token, l10nRestrictKeywords] of tokenToKeyword.entries()) {
      let icon = UrlbarUtils.LOCAL_SEARCH_MODES.find(
        mode => mode.restrict == token
      )?.icon;

      let result = new lazy.UrlbarResult({
        type: UrlbarUtils.RESULT_TYPE.RESTRICT,
        source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
        hideRowLabel: true,
        payload: {
          icon,
          keyword: token,
          l10nRestrictKeywords,
          providesSearchMode: true,
        },
        highlights: {
          l10nRestrictKeywords: UrlbarUtils.HIGHLIGHT.TYPED,
        },
      });
      addCallback(this, result);
    }
  }
}
