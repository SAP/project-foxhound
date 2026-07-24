/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that provides a heuristic result. The result
 * will be provided if the query requests the URL and the URL is in Places with
 * the page title.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
});

/**
 * Class used to create the provider.
 */
export class UrlbarProviderHistoryUrlHeuristic extends UrlbarProvider {
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
    // For better performance, this provider tries to return a result only when
    // the input value can become a URL of the http(s) protocol and its length
    // is less than `MAX_TEXT_LENGTH`. That way its SQL query avoids calling
    // `hash()` on atypical or very long URLs.
    return (
      queryContext.fixupInfo?.href &&
      !queryContext.fixupInfo.isSearch &&
      queryContext.fixupInfo.scheme.startsWith("http") &&
      queryContext.fixupInfo.href.length <= UrlbarUtils.MAX_TEXT_LENGTH
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
    const instance = this.queryInstance;
    const result = await this.#getResult(queryContext);
    if (result && instance === this.queryInstance) {
      addCallback(this, result);
    }
  }

  async #getResult(queryContext) {
    const inputedURL = queryContext.fixupInfo.href;
    const [strippedURL] = UrlbarUtils.stripPrefixAndTrim(inputedURL, {
      stripHttp: true,
      stripHttps: true,
      stripWww: true,
      trimEmptyQuery: true,
    });
    const connection = await lazy.PlacesUtils.promiseLargeCacheDBConnection();
    const resultSet = await connection.executeCached(
      `
      SELECT url, IIF(last_visit_date NOTNULL, h.title, b.title) AS _title, frecency
      FROM moz_places h
      LEFT JOIN moz_bookmarks b ON b.fk = h.id
      WHERE
        url_hash IN (
          hash('https://' || :strippedURL),
          hash('https://www.' || :strippedURL),
          hash('http://' || :strippedURL),
          hash('http://www.' || :strippedURL)
        )
        AND frecency <> 0
      ORDER BY
        _title NOTNULL DESC,
        _title || '/' <> :strippedURL DESC,
        h.url = :inputedURL DESC,
        h.frecency DESC,
        h.id DESC
      LIMIT 1
      `,
      { inputedURL, strippedURL }
    );

    if (!resultSet.length) {
      return null;
    }

    const title = resultSet[0].getResultByName("_title");
    if (!title) {
      return null;
    }

    return new lazy.UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.HISTORY,
      heuristic: true,
      payload: {
        url: inputedURL,
        title,
        icon: UrlbarUtils.getIconForUrl(resultSet[0].getResultByName("url")),
      },
      highlights: {
        url: UrlbarUtils.HIGHLIGHT.TYPED,
      },
    });
  }
}
