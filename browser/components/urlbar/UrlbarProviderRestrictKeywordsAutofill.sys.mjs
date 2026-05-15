/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that offers restrict keywords autofill for
 * search mode.
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
export class UrlbarProviderRestrictKeywordsAutofill extends UrlbarProvider {
  #autofillData;
  #lowerCaseTokenToKeywords;

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

  async #getLowerCaseTokenToKeywords() {
    let tokenToKeywords = await lazy.UrlbarTokenizer.getL10nRestrictKeywords();

    this.#lowerCaseTokenToKeywords = new Map(
      [...tokenToKeywords].map(([token, keywords]) => [
        token,
        keywords.map(keyword => keyword.toLowerCase()),
      ])
    );

    return this.#lowerCaseTokenToKeywords;
  }

  async #getKeywordAliases() {
    return Array.from(await this.#lowerCaseTokenToKeywords.values())
      .flat()
      .map(keyword => "@" + keyword);
  }

  async isActive(queryContext) {
    if (!lazy.UrlbarPrefs.getScotchBonnetPref(RESTRICT_KEYWORDS_FEATURE_GATE)) {
      return false;
    }

    this.#autofillData = null;

    if (
      queryContext.searchMode ||
      queryContext.tokens.length != 1 ||
      queryContext.searchString.length == 1 ||
      queryContext.restrictSource ||
      !queryContext.searchString.startsWith("@")
    ) {
      return false;
    }

    // Returns partial autofill result when the user types
    // @h, @hi, @hist, etc.
    if (lazy.UrlbarPrefs.get("autoFill") && queryContext.allowAutofill) {
      let instance = this.queryInstance;
      let result = await this.#getAutofillResult(queryContext);
      if (result && instance == this.queryInstance) {
        this.#autofillData = { result, instance };
        return true;
      }
    }

    // Returns full autofill result when user types keyword with space to
    // enter seach mode. Example, "@history ".
    let keywordAliases = await this.#getKeywordAliases();
    if (
      keywordAliases.some(keyword =>
        keyword.startsWith(queryContext.trimmedLowerCaseSearchString)
      )
    ) {
      return true;
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
    if (
      this.#autofillData &&
      this.#autofillData.instance == this.queryInstance
    ) {
      addCallback(this, this.#autofillData.result);
      return;
    }

    let instance = this.queryInstance;
    let typedKeyword = queryContext.lowerCaseSearchString;
    let typedKeywordTrimmed =
      queryContext.trimmedLowerCaseSearchString.substring(1);
    let tokenToKeywords = await this.#getLowerCaseTokenToKeywords();

    if (instance != this.queryInstance) {
      return;
    }

    let restrictSymbol;
    let aliasKeyword;

    for (let [token, keywords] of tokenToKeywords) {
      if (keywords.includes(typedKeywordTrimmed)) {
        restrictSymbol = token;
        aliasKeyword = "@" + typedKeywordTrimmed + " ";
        break;
      }
    }

    if (restrictSymbol && typedKeyword == aliasKeyword) {
      let result = new lazy.UrlbarResult({
        type: UrlbarUtils.RESULT_TYPE.RESTRICT,
        source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
        heuristic: true,
        hideRowLabel: true,
        payload: {
          keyword: restrictSymbol,
          providesSearchMode: false,
        },
      });
      addCallback(this, result);
    }

    this.#autofillData = null;
  }

  cancelQuery() {
    if (this.#autofillData?.instance == this.queryInstance) {
      this.#autofillData = null;
    }
  }

  async #getAutofillResult(queryContext) {
    let tokenToKeywords = await this.#getLowerCaseTokenToKeywords();
    let { lowerCaseSearchString } = queryContext;

    for (let [token, l10nRestrictKeywords] of tokenToKeywords.entries()) {
      let keywords = [...l10nRestrictKeywords].map(keyword => `@${keyword}`);
      let autofillKeyword = keywords.find(keyword =>
        keyword.startsWith(lowerCaseSearchString)
      );

      // found the keyword
      if (autofillKeyword) {
        // Add an autofill result. Append a space so the user can hit enter
        // or the right arrow key and immediately start typing their query.
        let keywordPreservingUserCase =
          queryContext.searchString +
          autofillKeyword.substr(queryContext.searchString.length);
        let value = keywordPreservingUserCase + " ";
        let icon = UrlbarUtils.LOCAL_SEARCH_MODES.find(
          mode => mode.restrict == token
        )?.icon;

        return new lazy.UrlbarResult({
          type: UrlbarUtils.RESULT_TYPE.RESTRICT,
          source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
          hideRowLabel: true,
          autofill: {
            value,
            selectionStart: queryContext.searchString.length,
            selectionEnd: value.length,
          },
          payload: {
            icon,
            keyword: token,
            l10nRestrictKeywords,
            autofillKeyword: keywordPreservingUserCase,
            providesSearchMode: true,
          },
          highlights: {
            l10nRestrictKeywords: UrlbarUtils.HIGHLIGHT.TYPED,
            autofillKeyword: UrlbarUtils.HIGHLIGHT.TYPED,
          },
        });
      }
    }

    return null;
  }
}
