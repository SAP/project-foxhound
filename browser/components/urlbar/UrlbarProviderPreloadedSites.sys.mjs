/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that provides preloaded site results. These
 * are intended to populate address bar results when the user has no history.
 * They can be both autofilled and provided as regular results.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import {
  UrlbarProvider,
  UrlbarUtils,
} from "resource:///modules/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ProfileAge: "resource://gre/modules/ProfileAge.sys.mjs",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  UrlbarResult: "resource:///modules/UrlbarResult.sys.mjs",
  UrlbarTokenizer: "resource:///modules/UrlbarTokenizer.sys.mjs",
});

const MS_PER_DAY = 86400000; // 24 * 60 * 60 * 1000

function PreloadedSite(url, title) {
  this.uri = Services.io.newURI(url);
  this.title = title;
  this._matchTitle = title.toLowerCase();
  this._hasWWW = this.uri.host.startsWith("www.");
  this._hostWithoutWWW = this._hasWWW ? this.uri.host.slice(4) : this.uri.host;
}

/**
 * Storage object for Preloaded Sites.
 *   add(url, title): adds a site to storage
 *   populate(sites) : populates the  storage with array of [url,title]
 *   sites[]: resulting array of sites (PreloadedSite objects)
 */
XPCOMUtils.defineLazyGetter(lazy, "PreloadedSiteStorage", () =>
  Object.seal({
    sites: [],

    add(url, title) {
      let site = new PreloadedSite(url, title);
      this.sites.push(site);
    },

    populate(sites) {
      this.sites = [];
      for (let site of sites) {
        this.add(site[0], site[1]);
      }
    },
  })
);

XPCOMUtils.defineLazyGetter(lazy, "ProfileAgeCreatedPromise", async () => {
  let times = await lazy.ProfileAge();
  return times.created;
});

/**
 * Class used to create the provider.
 */
class ProviderPreloadedSites extends UrlbarProvider {
  constructor() {
    super();

    if (lazy.UrlbarPrefs.get("usepreloadedtopurls.enabled")) {
      fetch("chrome://browser/content/urlbar/preloaded-top-urls.json")
        .then(response => response.json())
        .then(sites => lazy.PreloadedSiteStorage.populate(sites))
        .catch(ex => this.logger.error(ex));
    }
  }

  /**
   * Returns the name of this provider.
   *
   * @returns {string} the name of this provider.
   */
  get name() {
    return "PreloadedSites";
  }

  /**
   * Returns the type of this provider.
   *
   * @returns {integer} one of the types from UrlbarUtils.PROVIDER_TYPE.*
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
   * @returns {boolean} Whether this provider should be invoked for the search.
   */
  async isActive(queryContext) {
    let instance = this.queryInstance;

    // This is usually reset on canceling or completing the query, but since we
    // query in isActive, it may not have been canceled by the previous call.
    // It is an object with values { result: UrlbarResult, instance: Query }.
    // See the documentation for _getAutofillData for more information.
    this._autofillData = null;

    await this._checkPreloadedSitesExpiry();
    if (instance != this.queryInstance) {
      return false;
    }

    if (!lazy.UrlbarPrefs.get("usepreloadedtopurls.enabled")) {
      return false;
    }

    if (
      !lazy.UrlbarPrefs.get("autoFill") ||
      !queryContext.allowAutofill ||
      queryContext.tokens.length != 1
    ) {
      return false;
    }

    // Trying to autofill an extremely long string would be expensive, and
    // not particularly useful since the filled part falls out of screen anyway.
    if (queryContext.searchString.length > UrlbarUtils.MAX_TEXT_LENGTH) {
      return false;
    }

    [this._strippedPrefix, this._searchString] = UrlbarUtils.stripURLPrefix(
      queryContext.searchString
    );
    if (!this._searchString || !this._searchString.length) {
      return false;
    }
    this._lowerCaseSearchString = this._searchString.toLowerCase();
    this._strippedPrefix = this._strippedPrefix.toLowerCase();

    // As an optimization, don't try to autofill if the search term includes any
    // whitespace.
    if (lazy.UrlbarTokenizer.REGEXP_SPACES.test(queryContext.searchString)) {
      return false;
    }

    // Fetch autofill result now, rather than in startQuery. We do this so the
    // muxer doesn't have to wait on autofill for every query, since startQuery
    // will be guaranteed to return a result very quickly using this approach.
    // Bug 1651101 is filed to improve this behaviour.
    let result = await this._getAutofillResult(queryContext);
    if (instance != this.queryInstance) {
      return false;
    }
    this._autofillData = { result, instance };
    return true;
  }

  /**
   * Starts querying.
   *
   * @param {object} queryContext The query context object
   * @param {Function} addCallback Callback invoked by the provider to add a new
   *        result.
   * @returns {Promise} resolved when the query stops.
   */
  async startQuery(queryContext, addCallback) {
    // Check if the query was cancelled while the autofill result was being
    // fetched. We don't expect this to be true since we also check the instance
    // in isActive and clear _autofillData in cancelQuery, but we sanity check it.
    if (
      this._autofillData.result &&
      this._autofillData.instance == this.queryInstance
    ) {
      this._autofillData.result.heuristic = true;
      addCallback(this, this._autofillData.result);
      this._autofillData = null;
    }

    // Now, add non-autofill preloaded sites.
    for (let site of lazy.PreloadedSiteStorage.sites) {
      let url = site.uri.spec;
      if (
        (!this._strippedPrefix || url.startsWith(this._strippedPrefix)) &&
        (site.uri.host.includes(this._lowerCaseSearchString) ||
          site._matchTitle.includes(this._lowerCaseSearchString))
      ) {
        let result = new lazy.UrlbarResult(
          UrlbarUtils.RESULT_TYPE.URL,
          UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
          ...lazy.UrlbarResult.payloadAndSimpleHighlights(queryContext.tokens, {
            title: [site.title, UrlbarUtils.HIGHLIGHT.TYPED],
            url: [url, UrlbarUtils.HIGHLIGHT.TYPED],
            icon: UrlbarUtils.getIconForUrl(url),
          })
        );
        addCallback(this, result);
      }
    }
  }

  /**
   * Cancels a running query.
   *
   * @param {object} queryContext The query context object
   */
  cancelQuery(queryContext) {
    if (this._autofillData?.instance == this.queryInstance) {
      this._autofillData = null;
    }
  }

  /**
   * Populates the preloaded site cache with a list of sites. Intended for tests
   * only.
   *
   * @param {Array} list
   *   An array of URLs mapped to titles. See preloaded-top-urls.json for
   *   the format.
   */
  populatePreloadedSiteStorage(list) {
    lazy.PreloadedSiteStorage.populate(list);
  }

  async _getAutofillResult(queryContext) {
    let matchedSite = lazy.PreloadedSiteStorage.sites.find(site => {
      return (
        (!this._strippedPrefix ||
          site.uri.spec.startsWith(this._strippedPrefix)) &&
        (site.uri.host.startsWith(this._lowerCaseSearchString) ||
          site.uri.host.startsWith("www." + this._lowerCaseSearchString))
      );
    });
    if (!matchedSite) {
      return null;
    }

    let url = matchedSite.uri.spec;

    let [title] = UrlbarUtils.stripPrefixAndTrim(url, {
      stripHttp: true,
      trimEmptyQuery: true,
      trimSlash: !this._searchString.includes("/"),
    });

    let result = new lazy.UrlbarResult(
      UrlbarUtils.RESULT_TYPE.URL,
      UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
      ...lazy.UrlbarResult.payloadAndSimpleHighlights(queryContext.tokens, {
        fallbackTitle: [title, UrlbarUtils.HIGHLIGHT.TYPED],
        url: [url, UrlbarUtils.HIGHLIGHT.TYPED],
        icon: UrlbarUtils.getIconForUrl(url),
      })
    );

    let value = UrlbarUtils.stripURLPrefix(url)[1];
    value =
      this._strippedPrefix + value.substr(value.indexOf(this._searchString));
    let autofilledValue =
      queryContext.searchString +
      value.substring(queryContext.searchString.length);
    result.autofill = {
      type: "preloaded",
      value: autofilledValue,
      selectionStart: queryContext.searchString.length,
      selectionEnd: autofilledValue.length,
    };
    return result;
  }

  async _checkPreloadedSitesExpiry() {
    if (!lazy.UrlbarPrefs.get("usepreloadedtopurls.enabled")) {
      return;
    }
    let profileCreationDate = await lazy.ProfileAgeCreatedPromise;
    let daysSinceProfileCreation =
      (Date.now() - profileCreationDate) / MS_PER_DAY;
    if (
      daysSinceProfileCreation >
      lazy.UrlbarPrefs.get("usepreloadedtopurls.expire_days")
    ) {
      Services.prefs.setBoolPref(
        "browser.urlbar.usepreloadedtopurls.enabled",
        false
      );
    }
  }
}

export var UrlbarProviderPreloadedSites = new ProviderPreloadedSites();
