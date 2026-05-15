/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider returning the user's recent searches.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  DEFAULT_FORM_HISTORY_PARAM:
    "moz-src:///toolkit/components/search/SearchSuggestionController.sys.mjs",
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
});

// These prefs are relative to the `browser.urlbar` branch.
const ENABLED_PREF = "recentsearches.featureGate";
const SUGGEST_PREF = "suggest.recentsearches";
const EXPIRATION_PREF = "recentsearches.expirationMs";
const LASTDEFAULTCHANGED_PREF = "recentsearches.lastDefaultChanged";

/**
 * A provider that returns the Recent Searches performed by the user.
 */
export class UrlbarProviderRecentSearches extends UrlbarProvider {
  constructor() {
    super();
    Services.obs.addObserver(this, lazy.SearchUtils.TOPIC_ENGINE_MODIFIED);
  }

  /**
   * @returns {Values<typeof UrlbarUtils.PROVIDER_TYPE>}
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.PROFILE;
  }

  async isActive(queryContext) {
    return (
      lazy.UrlbarPrefs.get(ENABLED_PREF) &&
      lazy.UrlbarPrefs.get(SUGGEST_PREF) &&
      !queryContext.searchString &&
      // On the searchbar, we show recent searches of all engines,
      // regardless of the searchmode.
      ((!queryContext.searchMode && !queryContext.restrictSource) ||
        queryContext.sapName == "searchbar")
    );
  }

  /**
   * We use the same priority as `UrlbarProviderTopSites` as these are both
   * shown on an empty urlbar query.
   *
   * @returns {number} The provider's priority for the given query.
   */
  getPriority() {
    return 1;
  }

  onEngagement(queryContext, controller, details) {
    let { result } = details;

    if (details.selType == "dismiss") {
      // Unlike in startQuery, do not pass the engine as `source`,
      // otherwise it will only remove the source relation.
      lazy.FormHistory.update({
        op: "remove",
        fieldname: lazy.DEFAULT_FORM_HISTORY_PARAM,
        value: result.payload.suggestion,
      }).catch(error =>
        console.error(`Removing form history failed: ${error}`)
      );
      controller.removeResult(result);
    }
  }

  /**
   * Starts querying.
   *
   * @param {UrlbarQueryContext} queryContext
   * @param {(provider: UrlbarProvider, result: UrlbarResult) => void} addCallback
   *   Callback invoked by the provider to add a new result.
   */
  async startQuery(queryContext, addCallback) {
    let engine;
    if (queryContext.searchMode?.engineName) {
      engine = lazy.UrlbarSearchUtils.getEngineByName(
        queryContext.searchMode.engineName
      );
    } else {
      engine = lazy.UrlbarSearchUtils.getDefaultEngine(queryContext.isPrivate);
    }
    if (!engine) {
      return;
    }

    let results = await lazy.FormHistory.search(["value", "lastUsed"], {
      fieldname: lazy.DEFAULT_FORM_HISTORY_PARAM,
      // Use undefined to show recent searches of all engines.
      source: queryContext.sapName == "searchbar" ? undefined : engine.name,
    });

    let now = Date.now();

    let expiration;
    if (queryContext.sapName != "searchbar") {
      expiration = parseInt(lazy.UrlbarPrefs.get(EXPIRATION_PREF), 10);
      let lastDefaultChanged = parseInt(
        lazy.UrlbarPrefs.get(LASTDEFAULTCHANGED_PREF),
        10
      );
      // We only want to show searches since the last engine change, if we
      // havent changed the engine we expire the display of the searches
      // after a period of time.
      if (lastDefaultChanged != -1) {
        expiration = Math.min(expiration, now - lastDefaultChanged);
      }
    } else {
      expiration = Infinity;
    }

    results = results.filter(
      result => now - Math.floor(result.lastUsed / 1000) < expiration
    );
    results.sort((a, b) => b.lastUsed - a.lastUsed);

    if (results.length > lazy.UrlbarPrefs.get("recentsearches.maxResults")) {
      results.length = lazy.UrlbarPrefs.get("recentsearches.maxResults");
    }

    for (let result of results) {
      let res = new lazy.UrlbarResult({
        type: UrlbarUtils.RESULT_TYPE.SEARCH,
        source: UrlbarUtils.RESULT_SOURCE.HISTORY,
        payload: {
          engine: engine.name,
          suggestion: result.value,
          title: result.value,
          isBlockable: true,
          blockL10n: { id: "urlbar-result-menu-remove-from-history" },
          helpUrl:
            Services.urlFormatter.formatURLPref("app.support.baseURL") +
            "awesome-bar-result-menu",
        },
      });
      addCallback(this, res);
    }
  }

  observe(subject, topic, data) {
    switch (data) {
      case lazy.SearchUtils.MODIFIED_TYPE.DEFAULT:
        lazy.UrlbarPrefs.set(LASTDEFAULTCHANGED_PREF, Date.now().toString());
        break;
    }
  }
}
