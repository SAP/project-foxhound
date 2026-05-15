/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider returning a private search entry.
 */

import {
  SkippableTimer,
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
  UrlbarTokenizer:
    "moz-src:///browser/components/urlbar/UrlbarTokenizer.sys.mjs",
});

/**
 * Class used to create the provider.
 */
export class UrlbarProviderPrivateSearch extends UrlbarProvider {
  constructor() {
    super();
  }

  /**
   * @returns {Values<typeof UrlbarUtils.PROVIDER_TYPE>}
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.PROFILE;
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
      lazy.UrlbarSearchUtils.separatePrivateDefaultUIEnabled &&
      !queryContext.isPrivate &&
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
    let searchString = queryContext.trimmedSearchString;
    if (
      queryContext.tokens.some(
        t => t.type == lazy.UrlbarTokenizer.TYPE.RESTRICT_SEARCH
      )
    ) {
      if (queryContext.tokens.length == 1) {
        // There's only the restriction token, bail out.
        return;
      }
      // Remove the restriction char from the search string.
      searchString = queryContext.tokens
        .filter(t => t.type != lazy.UrlbarTokenizer.TYPE.RESTRICT_SEARCH)
        .map(t => t.value)
        .join(" ");
    }

    let instance = this.queryInstance;

    let engine = queryContext.searchMode?.engineName
      ? lazy.SearchService.getEngineByName(queryContext.searchMode.engineName)
      : await lazy.SearchService.getDefaultPrivate();
    let isPrivateEngine =
      lazy.UrlbarSearchUtils.separatePrivateDefault &&
      engine != (await lazy.SearchService.getDefault());
    this.logger.info(`isPrivateEngine: ${isPrivateEngine}`);

    // This is a delay added before returning results, to avoid flicker.
    // Our result must appear only when all results are searches, but if search
    // results arrive first, then the muxer would insert our result and then
    // immediately remove it when non-search results arrive.
    await new SkippableTimer({
      name: "ProviderPrivateSearch",
      time: 100,
      logger: this.logger,
    }).promise;

    let icon = await engine.getIconURL();
    if (instance != this.queryInstance) {
      return;
    }

    let result = new lazy.UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.SEARCH,
      source: UrlbarUtils.RESULT_SOURCE.SEARCH,
      suggestedIndex: 1,
      payload: {
        engine: engine.name,
        query: searchString,
        title: searchString,
        icon,
        inPrivateWindow: true,
        isPrivateEngine,
      },
      highlights: {
        engine: UrlbarUtils.HIGHLIGHT.TYPED,
      },
    });
    addCallback(this, result);
  }
}
