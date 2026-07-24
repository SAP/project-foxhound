/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that offers input history (aka adaptive
 * history) results. These results map typed search strings to Urlbar results.
 * That way, a user can find a particular result again by typing the same
 * string.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarProviderOpenTabs:
    "moz-src:///browser/components/urlbar/UrlbarProviderOpenTabs.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "SQL_ADAPTIVE_QUERY", () => {
  // Constants to support an alternative frecency algorithm.
  const PAGES_USE_ALT_FRECENCY =
    lazy.PlacesUtils.history.isAlternativeFrecencyEnabled;
  const PAGES_FRECENCY_FIELD = PAGES_USE_ALT_FRECENCY
    ? "alt_frecency"
    : "frecency";
  return `/* do not warn (bug 487789) */
   SELECT h.url,
          h.title,
          EXISTS(SELECT 1 FROM moz_bookmarks WHERE fk = h.id) AS bookmarked,
          ( SELECT title FROM moz_bookmarks WHERE fk = h.id AND title NOTNULL
            ORDER BY lastModified DESC LIMIT 1
          ) AS bookmark_title,
          ( SELECT GROUP_CONCAT(t.title ORDER BY t.title)
            FROM moz_bookmarks b
            JOIN moz_bookmarks t ON t.id = +b.parent AND t.parent = :parent
            WHERE b.fk = h.id
          ) AS tags,
          t.open_count,
          t.userContextId,
          h.last_visit_date
   FROM (
     SELECT ROUND(MAX(use_count) * (1 + (input = :search_string)), 1) AS rank,
            place_id
     FROM moz_inputhistory
     WHERE input BETWEEN :search_string AND :search_string || X'FFFF'
     GROUP BY place_id
   ) AS i
   JOIN moz_places h ON h.id = i.place_id
   LEFT JOIN moz_openpages_temp t
          ON t.url = h.url
          AND (t.userContextId = :userContextId OR (t.userContextId <> -1 AND :userContextId IS NULL))
   WHERE AUTOCOMPLETE_MATCH(NULL, h.url,
                            IFNULL(bookmark_title, h.title), tags,
                            h.visit_count, h.typed, bookmarked,
                            t.open_count,
                            :matchBehavior, :searchBehavior,
                            NULL)
   ORDER BY rank DESC, ${PAGES_FRECENCY_FIELD} DESC
   LIMIT :maxResults`;
});

/**
 * Class used to create the provider.
 */
export class UrlbarProviderInputHistory extends UrlbarProvider {
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
      (lazy.UrlbarPrefs.get("suggest.history") ||
        lazy.UrlbarPrefs.get("suggest.bookmark") ||
        lazy.UrlbarPrefs.get("suggest.openpage")) &&
      !queryContext.searchMode
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

    let conn = await lazy.PlacesUtils.promiseLargeCacheDBConnection();
    if (instance != this.queryInstance) {
      return;
    }

    let [query, params] = this._getAdaptiveQuery(queryContext);
    let rows = await conn.executeCached(query, params);
    if (instance != this.queryInstance) {
      return;
    }

    for (let row of rows) {
      const url = row.getResultByName("url");
      const openPageCount = row.getResultByName("open_count") || 0;
      const historyTitle = row.getResultByName("title") || "";
      const bookmarked = row.getResultByName("bookmarked");
      const bookmarkTitle = bookmarked
        ? row.getResultByName("bookmark_title")
        : null;
      const tags = row.getResultByName("tags") || "";
      let lastVisitPRTime = row.getResultByName("last_visit_date");
      let lastVisit = lastVisitPRTime
        ? lazy.PlacesUtils.toDate(lastVisitPRTime).getTime()
        : undefined;
      let resultTitle = historyTitle;

      if (openPageCount > 0 && lazy.UrlbarPrefs.get("suggest.openpage")) {
        if (url == queryContext.currentPage) {
          // Don't suggest switching to the current page.
          continue;
        }
        let userContextId = row.getResultByName("userContextId") || 0;
        let result = new lazy.UrlbarResult({
          type: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
          source: UrlbarUtils.RESULT_SOURCE.TABS,
          payload: {
            url,
            title: resultTitle,
            icon: UrlbarUtils.getIconForUrl(url),
            userContextId,
            lastVisit,
            action: lazy.UrlbarPrefs.get("secondaryActions.switchToTab")
              ? UrlbarUtils.createTabSwitchSecondaryAction(userContextId)
              : undefined,
          },
          highlights: {
            url: UrlbarUtils.HIGHLIGHT.TYPED,
            title: UrlbarUtils.HIGHLIGHT.TYPED,
          },
        });
        addCallback(this, result);
        continue;
      }

      let resultSource;
      if (bookmarked && lazy.UrlbarPrefs.get("suggest.bookmark")) {
        resultSource = UrlbarUtils.RESULT_SOURCE.BOOKMARKS;
        resultTitle = bookmarkTitle || historyTitle;
      } else if (lazy.UrlbarPrefs.get("suggest.history")) {
        resultSource = UrlbarUtils.RESULT_SOURCE.HISTORY;
      } else {
        continue;
      }

      let resultTags = tags.split(",").filter(tag => {
        let lowerCaseTag = tag.toLocaleLowerCase();
        return queryContext.tokens.some(token =>
          lowerCaseTag.includes(token.lowerCaseValue)
        );
      });

      let isBlockable = resultSource == UrlbarUtils.RESULT_SOURCE.HISTORY;

      let result = new lazy.UrlbarResult({
        type: UrlbarUtils.RESULT_TYPE.URL,
        source: resultSource,
        payload: {
          url,
          title: resultTitle,
          tags: resultTags,
          icon: UrlbarUtils.getIconForUrl(url),
          isBlockable,
          blockL10n: isBlockable
            ? { id: "urlbar-result-menu-remove-from-history" }
            : undefined,
          helpUrl: isBlockable
            ? Services.urlFormatter.formatURLPref("app.support.baseURL") +
              "awesome-bar-result-menu"
            : undefined,
          lastVisit,
        },
        highlights: {
          url: UrlbarUtils.HIGHLIGHT.TYPED,
          title: UrlbarUtils.HIGHLIGHT.TYPED,
          tags: UrlbarUtils.HIGHLIGHT.TYPED,
        },
      });

      addCallback(this, result);
    }
  }

  onEngagement(queryContext, controller, details) {
    let { result } = details;
    if (
      details.selType == "dismiss" &&
      result.type == UrlbarUtils.RESULT_TYPE.URL
    ) {
      // Even if removing history normally also removes input history, that
      // doesn't happen if the page is bookmarked, so we do remove input history
      // regardless for this specific search term.
      UrlbarUtils.removeInputHistory(
        result.payload.url,
        queryContext.searchString
      ).catch(console.error);
      // Remove browsing history for the page.
      lazy.PlacesUtils.history.remove(result.payload.url).catch(console.error);
      controller.removeResult(result);
    }
  }

  /**
   * Obtains the query to search for adaptive results.
   *
   * @param {UrlbarQueryContext} queryContext
   *   The current queryContext.
   * @returns {Array} Contains the optimized query with which to search the
   *  database and an object containing the params to bound.
   */
  _getAdaptiveQuery(queryContext) {
    return [
      lazy.SQL_ADAPTIVE_QUERY,
      {
        parent: lazy.PlacesUtils.tagsFolderId,
        search_string: queryContext.lowerCaseSearchString,
        matchBehavior: Ci.mozIPlacesAutoComplete.MATCH_ANYWHERE,
        searchBehavior: lazy.UrlbarPrefs.get("defaultBehavior"),
        userContextId:
          lazy.UrlbarProviderOpenTabs.getUserContextIdForOpenPagesTable(
            null,
            queryContext.isPrivate
          ),
        maxResults: queryContext.maxResults,
      },
    ];
  }
}
