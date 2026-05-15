/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that offers engines with aliases as heuristic
 * results.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
});

/**
 * Class used to create the provider.
 */
export class UrlbarProviderAliasEngines extends UrlbarProvider {
  /**
   * @returns {Values<typeof UrlbarUtils.PROVIDER_TYPE>}
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.HEURISTIC;
  }

  /**
   * Whether this provider should be invoked for the given context.
   * If this method returns false, the providers manager won't start a query
   * with this provider, to save on resources.
   *
   * @param {UrlbarQueryContext} queryContext The query context object
   */
  async isActive(queryContext) {
    return (
      (!queryContext.restrictSource ||
        queryContext.restrictSource == UrlbarUtils.RESULT_SOURCE.SEARCH) &&
      !queryContext.searchMode &&
      !!queryContext.tokens.length
    );
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
    let alias = queryContext.tokens[0]?.value;
    let engine = await lazy.UrlbarSearchUtils.engineForAlias(
      alias,
      queryContext.searchString
    );
    let icon = await engine?.getIconURL();
    if (!engine || instance != this.queryInstance) {
      return;
    }
    let query = UrlbarUtils.substringAfter(
      queryContext.searchString,
      alias
    ).trimStart();
    let result = new lazy.UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.SEARCH,
      source: UrlbarUtils.RESULT_SOURCE.SEARCH,
      heuristic: true,
      payload: {
        engine: engine.name,
        keyword: alias,
        query,
        title: query,
        icon,
      },
    });
    addCallback(this, result);
  }
}
