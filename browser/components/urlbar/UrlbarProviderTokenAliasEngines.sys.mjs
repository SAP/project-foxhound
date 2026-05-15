/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that offers token alias engines.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
  UrlUtils: "resource://gre/modules/UrlUtils.sys.mjs",
});

/**
 * Class used to create the provider.
 */
export class UrlbarProviderTokenAliasEngines extends UrlbarProvider {
  constructor() {
    super();
    this._engines = [];
  }

  /**
   * @returns {Values<typeof UrlbarUtils.PROVIDER_TYPE>}
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.HEURISTIC;
  }

  static get PRIORITY() {
    // Beats UrlbarProviderSearchSuggestions and UrlbarProviderPlaces.
    return 1;
  }

  /**
   * Whether this provider should be invoked for the given context.
   * If this method returns false, the providers manager won't start a query
   * with this provider, to save on resources.
   *
   * @param {UrlbarQueryContext} queryContext The query context object
   */
  async isActive(queryContext) {
    let instance = this.queryInstance;

    // This is usually reset on canceling or completing the query, but since we
    // query in isActive, it may not have been canceled by the previous call.
    // It is an object with values { result: UrlbarResult, instance: Query }.
    this._autofillData = null;

    // Once the user starts typing a search string after the token, we hand off
    // suggestions to UrlbarProviderSearchSuggestions.
    if (
      !queryContext.searchString.startsWith("@") ||
      queryContext.tokens.length != 1
    ) {
      return false;
    }

    // Do not show token alias results in search mode.
    if (queryContext.searchMode) {
      return false;
    }

    this._engines = await lazy.UrlbarSearchUtils.tokenAliasEngines();
    if (!this._engines.length) {
      return false;
    }

    // Check the query was not canceled while this executed.
    if (instance != this.queryInstance) {
      return false;
    }

    if (queryContext.trimmedSearchString == "@") {
      return true;
    }

    // If the user is typing a potential engine name, autofill it.
    if (lazy.UrlbarPrefs.get("autoFill") && queryContext.allowAutofill) {
      let result = await this._getAutofillResult(queryContext);
      if (result && instance == this.queryInstance) {
        this._autofillData = { result, instance };
        return true;
      }
    }

    return false;
  }

  /**
   * Starts querying.
   *
   * @param {UrlbarQueryContext} queryContext
   * @param {(provider: UrlbarProvider, result: UrlbarResult) => void} addCallback
   *   Callback invoked by the provider to add a new result.
   */
  async startQuery(queryContext, addCallback) {
    if (!this._engines || !this._engines.length) {
      return;
    }

    if (
      this._autofillData &&
      this._autofillData.instance == this.queryInstance
    ) {
      addCallback(this, this._autofillData.result);
    }

    let instance = this.queryInstance;
    for (let { engine, tokenAliases } of this._engines) {
      if (
        tokenAliases[0].startsWith(queryContext.trimmedSearchString) &&
        engine.name != this._autofillData?.result.payload.engine
      ) {
        let result = new lazy.UrlbarResult({
          type: UrlbarUtils.RESULT_TYPE.SEARCH,
          source: UrlbarUtils.RESULT_SOURCE.SEARCH,
          hideRowLabel: true,
          payload: {
            engine: engine.name,
            keyword: tokenAliases[0],
            keywords: tokenAliases.join(", "),
            query: "",
            icon: await engine.getIconURL(),
            providesSearchMode: true,
          },
          highlights: {
            engine: UrlbarUtils.HIGHLIGHT.TYPED,
            keyword: UrlbarUtils.HIGHLIGHT.TYPED,
          },
        });
        if (instance != this.queryInstance) {
          break;
        }
        addCallback(this, result);
      }
    }

    this._autofillData = null;
  }

  /**
   * Gets the provider's priority.
   *
   * @returns {number} The provider's priority for the given query.
   */
  getPriority() {
    return UrlbarProviderTokenAliasEngines.PRIORITY;
  }

  /**
   * Cancels a running query.
   */
  cancelQuery() {
    if (this._autofillData?.instance == this.queryInstance) {
      this._autofillData = null;
    }
  }

  async _getAutofillResult(queryContext) {
    let { lowerCaseSearchString } = queryContext;

    // The user is typing a specific engine. We should show a heuristic result.
    for (let { engine, tokenAliases } of this._engines) {
      for (let alias of tokenAliases) {
        if (alias.startsWith(lowerCaseSearchString)) {
          // We found the engine.

          // Stop adding an autofill result once the user has typed the full
          // alias followed by a space. We enter search mode at that point.
          if (
            lowerCaseSearchString.startsWith(alias) &&
            lazy.UrlUtils.REGEXP_SPACES_START.test(
              lowerCaseSearchString.substring(alias.length)
            )
          ) {
            return null;
          }

          // Add an autofill result.  Append a space so the user can hit enter
          // or the right arrow key and immediately start typing their query.
          let aliasPreservingUserCase =
            queryContext.searchString +
            alias.substr(queryContext.searchString.length);
          let value = aliasPreservingUserCase + " ";
          return new lazy.UrlbarResult({
            type: UrlbarUtils.RESULT_TYPE.SEARCH,
            source: UrlbarUtils.RESULT_SOURCE.SEARCH,
            // We set suggestedIndex = 0 instead of the heuristic because we
            // don't want this result to be automatically selected. That way,
            // users can press Tab to select the result, building on their
            // muscle memory from tab-to-search.
            suggestedIndex: 0,
            autofill: {
              value,
              selectionStart: queryContext.searchString.length,
              selectionEnd: value.length,
            },
            hideRowLabel: true,
            payload: {
              engine: engine.name,
              keyword: aliasPreservingUserCase,
              keywords: tokenAliases.join(", "),
              query: "",
              icon: await engine.getIconURL(),
              providesSearchMode: true,
            },
            highlights: {
              engine: UrlbarUtils.HIGHLIGHT.TYPED,
              keyword: UrlbarUtils.HIGHLIGHT.TYPED,
            },
          });
        }
      }
    }
    return null;
  }
}
