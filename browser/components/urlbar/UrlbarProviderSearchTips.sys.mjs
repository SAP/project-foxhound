/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that might show a tip when the user opens
 * the newtab or starts an organic search with their default search engine.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import {
  UrlbarProvider,
  UrlbarUtils,
} from "resource:///modules/UrlbarUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AppMenuNotifications: "resource://gre/modules/AppMenuNotifications.sys.mjs",
  DefaultBrowserCheck: "resource:///modules/BrowserGlue.sys.mjs",
  ProfileAge: "resource://gre/modules/ProfileAge.sys.mjs",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.sys.mjs",
  UrlbarProviderTopSites: "resource:///modules/UrlbarProviderTopSites.sys.mjs",
  UrlbarResult: "resource:///modules/UrlbarResult.sys.mjs",
  UrlbarSearchUtils: "resource:///modules/UrlbarSearchUtils.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "updateManager", () => {
  return (
    Cc["@mozilla.org/updates/update-manager;1"] &&
    Cc["@mozilla.org/updates/update-manager;1"].getService(Ci.nsIUpdateManager)
  );
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "cfrFeaturesUserPref",
  "browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features",
  true
);

// The possible tips to show.  These names (except NONE) are used in the names
// of keys in the `urlbar.tips` keyed scalar telemetry (see telemetry.rst).
// Don't modify them unless you've considered that.  If you do modify them or
// add new tips, then you are also adding new `urlbar.tips` keys and therefore
// need an expanded data collection review.
const TIPS = {
  NONE: "",
  ONBOARD: "searchTip_onboard",
  PERSIST: "searchTip_persist",
  REDIRECT: "searchTip_redirect",
};

// This maps engine names to regexes matching their homepages. We show the
// redirect tip on these pages. The Google domains are taken from
// https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/List_of_Google_domains.html.
const SUPPORTED_ENGINES = new Map([
  ["Bing", { domainPath: /^www\.bing\.com\/$/ }],
  [
    "DuckDuckGo",
    {
      domainPath: /^(start\.)?duckduckgo\.com\/$/,
      prohibitedSearchParams: ["q"],
    },
  ],
  [
    "Google",
    {
      domainPath: /^www\.google\.(com|ac|ad|ae|com\.af|com\.ag|com\.ai|al|am|co\.ao|com\.ar|as|at|com\.au|az|ba|com\.bd|be|bf|bg|com\.bh|bi|bj|com\.bn|com\.bo|com\.br|bs|bt|co\.bw|by|com\.bz|ca|com\.kh|cc|cd|cf|cat|cg|ch|ci|co\.ck|cl|cm|cn|com\.co|co\.cr|com\.cu|cv|com\.cy|cz|de|dj|dk|dm|com\.do|dz|com\.ec|ee|com\.eg|es|com\.et|fi|com\.fj|fm|fr|ga|ge|gf|gg|com\.gh|com\.gi|gl|gm|gp|gr|com\.gt|gy|com\.hk|hn|hr|ht|hu|co\.id|iq|ie|co\.il|im|co\.in|io|is|it|je|com\.jm|jo|co\.jp|co\.ke|ki|kg|co\.kr|com\.kw|kz|la|com\.lb|com\.lc|li|lk|co\.ls|lt|lu|lv|com\.ly|co\.ma|md|me|mg|mk|ml|com\.mm|mn|ms|com\.mt|mu|mv|mw|com\.mx|com\.my|co\.mz|com\.na|ne|com\.nf|com\.ng|com\.ni|nl|no|com\.np|nr|nu|co\.nz|com\.om|com\.pk|com\.pa|com\.pe|com\.ph|pl|com\.pg|pn|com\.pr|ps|pt|com\.py|com\.qa|ro|rs|ru|rw|com\.sa|com\.sb|sc|se|com\.sg|sh|si|sk|com\.sl|sn|sm|so|st|sr|com\.sv|td|tg|co\.th|com\.tj|tk|tl|tm|to|tn|com\.tr|tt|com\.tw|co\.tz|com\.ua|co\.ug|co\.uk|com\.uy|co\.uz|com\.vc|co\.ve|vg|co\.vi|com\.vn|vu|ws|co\.za|co\.zm|co\.zw)\/(webhp)?$/,
    },
  ],
]);

// The maximum number of times we'll show a tip across all sessions.
const MAX_SHOWN_COUNT = 4;

// Amount of time to wait before showing a tip after selecting a tab or
// navigating to a page where we should show a tip.
const SHOW_TIP_DELAY_MS = 200;

// Amount of time to wait before showing the persist tip after the
// onLocationChange event during the process of loading
// a default search engine results page.
const SHOW_PERSIST_TIP_DELAY_MS = 1500;

// We won't show a tip if the browser has been updated in the past
// LAST_UPDATE_THRESHOLD_MS.
const LAST_UPDATE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * A provider that sometimes returns a tip result when the user visits the
 * newtab page or their default search engine's homepage.
 */
class ProviderSearchTips extends UrlbarProvider {
  constructor() {
    super();

    // Whether we should disable tips for the current browser session, for
    // example because a tip was already shown.
    this.disableTipsForCurrentSession = true;
    for (let tip of Object.values(TIPS)) {
      if (
        tip &&
        lazy.UrlbarPrefs.get(`tipShownCount.${tip}`) < MAX_SHOWN_COUNT
      ) {
        this.disableTipsForCurrentSession = false;
        break;
      }
    }

    // Whether and what kind of tip we've shown in the current engagement.
    this.showedTipTypeInCurrentEngagement = TIPS.NONE;

    // Used to track browser windows we've seen.
    this._seenWindows = new WeakSet();
  }

  /**
   * Enum of the types of search tips.
   *
   * @returns {{ NONE: string; ONBOARD: string; PERSIST: string; REDIRECT: string; }}
   */
  get TIP_TYPE() {
    return TIPS;
  }

  get PRIORITY() {
    // Search tips are prioritized over the Places and top sites providers.
    return lazy.UrlbarProviderTopSites.PRIORITY + 1;
  }

  get SHOW_PERSIST_TIP_DELAY_MS() {
    return SHOW_PERSIST_TIP_DELAY_MS;
  }

  /**
   * Unique name for the provider, used by the context to filter on providers.
   * Not using a unique name will cause the newest registration to win.
   *
   * @returns {string}
   */
  get name() {
    return "UrlbarProviderSearchTips";
  }

  /**
   * The type of the provider.
   *
   * @returns {UrlbarUtils.PROVIDER_TYPE}
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
   * @returns {boolean} Whether this provider should be invoked for the search.
   */
  isActive(queryContext) {
    return this.currentTip && lazy.cfrFeaturesUserPref;
  }

  /**
   * Gets the provider's priority.
   *
   * @param {UrlbarQueryContext} queryContext The query context object
   * @returns {number} The provider's priority for the given query.
   */
  getPriority(queryContext) {
    return this.PRIORITY;
  }

  /**
   * Starts querying. Extended classes should return a Promise resolved when the
   * provider is done searching AND returning results.
   *
   * @param {UrlbarQueryContext} queryContext The query context object
   * @param {Function} addCallback Callback invoked by the provider to add a new
   *        result. A UrlbarResult should be passed to it.
   * @returns {Promise}
   */
  async startQuery(queryContext, addCallback) {
    let instance = this.queryInstance;

    let tip = this.currentTip;
    this.showedTipTypeInCurrentEngagement = this.currentTip;
    this.currentTip = TIPS.NONE;

    let defaultEngine = await Services.search.getDefault();
    if (instance != this.queryInstance) {
      return;
    }

    let result = new lazy.UrlbarResult(
      UrlbarUtils.RESULT_TYPE.TIP,
      UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
      {
        type: tip,
        buttons: [{ l10n: { id: "urlbar-search-tips-confirm" } }],
        icon: defaultEngine.iconURI?.spec,
      }
    );

    switch (tip) {
      case TIPS.ONBOARD:
        result.heuristic = true;
        result.payload.titleL10n = {
          id: "urlbar-search-tips-onboard",
          args: {
            engineName: defaultEngine.name,
          },
        };
        break;
      case TIPS.REDIRECT:
        result.heuristic = false;
        result.payload.titleL10n = {
          id: "urlbar-search-tips-redirect-2",
          args: {
            engineName: defaultEngine.name,
          },
        };
        break;
      case TIPS.PERSIST:
        result.heuristic = false;
        result.payload.titleL10n = {
          id: "urlbar-search-tips-persist",
        };
        result.payload.icon = UrlbarUtils.ICON.TIP;
        result.payload.buttons = [
          { l10n: { id: "urlbar-search-tips-confirm-short" } },
        ];
        break;
    }

    Services.telemetry.keyedScalarAdd("urlbar.tips", `${tip}-shown`, 1);

    addCallback(this, result);
  }

  /**
   * Called when the tip is selected.
   *
   * @param {UrlbarResult} result
   *   The result that was picked.
   */
  pickResult(result) {
    let tip = result.payload.type;
    let window = lazy.BrowserWindowTracker.getTopWindow();
    switch (tip) {
      case TIPS.PERSIST:
        window.gURLBar.removeAttribute("suppress-focus-border");
        window.gURLBar.select();
        break;
      default:
        window.gURLBar.value = "";
        window.gURLBar.setPageProxyState("invalid");
        window.gURLBar.removeAttribute("suppress-focus-border");
        window.gURLBar.focus();
        break;
    }
  }

  /**
   * Called when the user starts and ends an engagement with the urlbar.  For
   * details on parameters, see UrlbarProvider.onEngagement().
   *
   * @param {boolean} isPrivate
   *   True if the engagement is in a private context.
   * @param {string} state
   *   The state of the engagement, one of: start, engagement, abandonment,
   *   discard
   * @param {UrlbarQueryContext} queryContext
   *   The engagement's query context.  This is *not* guaranteed to be defined
   *   when `state` is "start".  It will always be defined for "engagement" and
   *   "abandonment".
   * @param {object} details
   *   This is defined only when `state` is "engagement" or "abandonment", and
   *   it describes the search string and picked result.
   */
  onEngagement(isPrivate, state, queryContext, details) {
    if (
      this.showedTipTypeInCurrentEngagement != TIPS.NONE &&
      state == "engagement"
    ) {
      // The user either clicked the tip's "Okay, Got It" button, or they
      // engaged with the urlbar while the tip was showing. We treat both as the
      // user's acknowledgment of the tip, and we don't show tips again in any
      // session. Set the shown count to the max.
      lazy.UrlbarPrefs.set(
        `tipShownCount.${this.showedTipTypeInCurrentEngagement}`,
        MAX_SHOWN_COUNT
      );
    }
    this.showedTipTypeInCurrentEngagement = TIPS.NONE;
  }

  /**
   * Called from `onLocationChange` in browser.js.
   *
   * @param {window} window
   *  The browser window where the location change happened.
   * @param {nsIURI} uri
   *  The URI being navigated to.
   * @param {nsIURI | null} originalUri
   *  The original URI being navigated to.
   * @param {nsIWebProgress} webProgress
   *   The progress object, which can have event listeners added to it.
   * @param {number} flags
   *   Load flags. See nsIWebProgressListener.idl for possible values.
   */
  async onLocationChange(window, uri, originalUri, webProgress, flags) {
    let instance = (this._onLocationChangeInstance = {});

    // If this is the first time we've seen this browser window, we take some
    // precautions to avoid impacting ts_paint.
    if (!this._seenWindows.has(window)) {
      this._seenWindows.add(window);

      // First, wait until MozAfterPaint is fired in the current content window.
      await window.gBrowserInit.firstContentWindowPaintPromise;
      if (instance != this._onLocationChangeInstance) {
        return;
      }

      // Second, wait 500ms.  ts_paint waits at most 500ms after MozAfterPaint
      // before ending.  We use XPCOM directly instead of Timer.sys.mjs to avoid the
      // perf impact of loading Timer.sys.mjs, in case it's not already loaded.
      await new Promise(resolve => {
        let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        timer.initWithCallback(resolve, 500, Ci.nsITimer.TYPE_ONE_SHOT);
      });
      if (instance != this._onLocationChangeInstance) {
        return;
      }
    }

    // Ignore events that don't change the document. Google is known to do this.
    // Also ignore changes in sub-frames. See bug 1623978.
    if (
      flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT ||
      !webProgress.isTopLevel
    ) {
      return;
    }

    // The UrlbarView is usually closed on location change when the input is
    // blurred. Since we open the view to show the redirect tip without focusing
    // the input, the view won't close in that case. We need to close it
    // manually.
    if (this.showedTipTypeInCurrentEngagement != TIPS.NONE) {
      window.gURLBar.view.close();
    }

    // Check if we are supposed to show a tip for the current session.
    if (
      !lazy.cfrFeaturesUserPref ||
      (this.disableTipsForCurrentSession &&
        !lazy.UrlbarPrefs.get("searchTips.test.ignoreShowLimits"))
    ) {
      return;
    }

    this._maybeShowTipForUrl(uri.spec, originalUri).catch(ex =>
      this.logger.error(ex)
    );
  }

  /**
   * Determines whether we should show a tip for the current tab, sets
   * this.currentTip, and starts a search on an empty string.
   *
   * @param {string} urlStr
   *   The URL of the page being loaded, in string form.
   * @param {nsIURI | null} originalUri
   *   The original URI of the page being loaded.
   */
  async _maybeShowTipForUrl(urlStr, originalUri) {
    let instance = {};
    this._maybeShowTipForUrlInstance = instance;

    let ignoreShowLimits = lazy.UrlbarPrefs.get(
      "searchTips.test.ignoreShowLimits"
    );

    // Determine which tip we should show for the tab.  Do this check first
    // before the others below.  It has less of a performance impact than the
    // others, so in the common case where the URL is not one we're interested
    // in, we can return immediately.
    let tip;
    let isNewtab = ["about:newtab", "about:home"].includes(urlStr);
    let isSearchHomepage = !isNewtab && (await isDefaultEngineHomepage(urlStr));

    // Only show the persist tip if: the feature is enabled,
    // it's been shown fewer than the maximum number of times
    // a specific tip can be shown to the user, and the
    // the url is a default SERP.
    let shouldShowPersistTip =
      lazy.UrlbarPrefs.isPersistedSearchTermsEnabled() &&
      (lazy.UrlbarPrefs.get(`tipShownCount.${TIPS.PERSIST}`) <
        MAX_SHOWN_COUNT ||
        ignoreShowLimits) &&
      !!lazy.UrlbarSearchUtils.getSearchTermIfDefaultSerpUri(
        originalUri ?? urlStr
      );

    if (isNewtab) {
      tip = TIPS.ONBOARD;
    } else if (isSearchHomepage) {
      tip = TIPS.REDIRECT;
    } else if (shouldShowPersistTip) {
      tip = TIPS.PERSIST;
    } else {
      // No tip.
      return;
    }

    // If we've shown this type of tip the maximum number of times over all
    // sessions, don't show it again.
    let shownCount = lazy.UrlbarPrefs.get(`tipShownCount.${tip}`);
    if (shownCount >= MAX_SHOWN_COUNT && !ignoreShowLimits) {
      return;
    }

    // Don't show a tip if the browser has been updated recently.
    // Exception: TIPS.PERSIST should show immediately
    // after the feature is enabled for users.
    let date = await lastBrowserUpdateDate();
    if (
      tip != TIPS.PERSIST &&
      Date.now() - date <= LAST_UPDATE_THRESHOLD_MS &&
      !ignoreShowLimits
    ) {
      return;
    }

    let tipDelay =
      tip == TIPS.PERSIST ? SHOW_PERSIST_TIP_DELAY_MS : SHOW_TIP_DELAY_MS;

    // Start a search.
    lazy.setTimeout(async () => {
      if (this._maybeShowTipForUrlInstance != instance) {
        return;
      }

      let window = lazy.BrowserWindowTracker.getTopWindow();
      // We don't want to interrupt a user's typed query with a Search Tip.
      // See bugs 1613662 and 1619547. The persist search tip is an
      // exception because the query is not erased.
      if (
        window.gURLBar.getAttribute("pageproxystate") == "invalid" &&
        window.gURLBar.value != "" &&
        tip != TIPS.PERSIST
      ) {
        return;
      }

      // The tab that initiated the tip might not be in the same window
      // as the one that is currently at the top. Only apply this search
      // tip to a tab showing a search term.
      if (
        tip == TIPS.PERSIST &&
        (!window.gBrowser.selectedBrowser.showingSearchTerms ||
          !window.gBrowser.selectedBrowser.userTypedValue)
      ) {
        return;
      }

      // Don't show a tip if the browser is already showing some other
      // notification.
      if (
        (!ignoreShowLimits && (await isBrowserShowingNotification())) ||
        this._maybeShowTipForUrlInstance != instance
      ) {
        return;
      }

      // Don't show a tip if a request is in progress, and the URI associated
      // with the request differs from the URI that triggered the search tip.
      // One contraint with this approach is related to Bug 1797748: SERPs
      // that use the History API to navigate between views will call
      // onLocationChange without a request, and thus, no originalUri is
      // available to check against, so the search tip and search terms may
      // show on search pages outside of the default SERP.
      let { documentRequest } = window.gBrowser.selectedBrowser.webProgress;
      if (
        documentRequest instanceof Ci.nsIChannel &&
        documentRequest.originalURI?.spec != originalUri?.spec &&
        (!isNewtab || originalUri)
      ) {
        return;
      }

      // At this point, we're showing a tip.
      this.disableTipsForCurrentSession = true;

      // Store the new shown count.
      lazy.UrlbarPrefs.set(`tipShownCount.${tip}`, shownCount + 1);

      this.currentTip = tip;

      let value =
        tip == TIPS.PERSIST
          ? window.gBrowser.selectedBrowser.userTypedValue
          : "";
      window.gURLBar.search(value, { focus: tip == TIPS.ONBOARD });
    }, tipDelay);
  }
}

async function isBrowserShowingNotification() {
  let window = lazy.BrowserWindowTracker.getTopWindow();

  // urlbar view and notification box (info bar)
  if (
    window.gURLBar.view.isOpen ||
    window.gNotificationBox.currentNotification ||
    window.gBrowser.getNotificationBox().currentNotification
  ) {
    return true;
  }

  // app menu notification doorhanger
  if (
    lazy.AppMenuNotifications.activeNotification &&
    !lazy.AppMenuNotifications.activeNotification.dismissed &&
    !lazy.AppMenuNotifications.activeNotification.options.badgeOnly
  ) {
    return true;
  }

  // tracking protection and identity box doorhangers
  if (
    [
      "tracking-protection-icon-container",
      "identity-icon-box",
      "identity-permission-box",
    ].some(
      id => window.document.getElementById(id).getAttribute("open") == "true"
    )
  ) {
    return true;
  }

  // page action button panels
  let pageActions = window.document.getElementById("page-action-buttons");
  if (pageActions) {
    for (let child of pageActions.childNodes) {
      if (child.getAttribute("open") == "true") {
        return true;
      }
    }
  }

  // toolbar button panels
  let navbar = window.document.getElementById("nav-bar-customization-target");
  for (let node of navbar.querySelectorAll("toolbarbutton")) {
    if (node.getAttribute("open") == "true") {
      return true;
    }
  }

  // Other modals like spotlight messages or default browser prompt
  // can be shown at startup
  if (window.gDialogBox.isOpen) {
    return true;
  }

  // On startup, the default browser check normally opens after the Search Tip.
  // As a result, we can't check for the prompt's presence, but we can check if
  // it plans on opening.
  const willPrompt = await lazy.DefaultBrowserCheck.willCheckDefaultBrowser(
    /* isStartupCheck */ false
  );
  if (willPrompt) {
    return true;
  }

  return false;
}

/**
 * Checks if the given URL is the homepage of the current default search engine.
 * Returns false if the default engine is not listed in SUPPORTED_ENGINES.
 *
 * @param {string} urlStr
 *   The URL to check, in string form.
 *
 * @returns {boolean}
 */
async function isDefaultEngineHomepage(urlStr) {
  let defaultEngine = await Services.search.getDefault();
  if (!defaultEngine) {
    return false;
  }

  let homepageMatches = SUPPORTED_ENGINES.get(defaultEngine.name);
  if (!homepageMatches) {
    return false;
  }

  // The URL object throws if the string isn't a valid URL.
  let url;
  try {
    url = new URL(urlStr);
  } catch (e) {
    return false;
  }

  if (url.searchParams.has(homepageMatches.prohibitedSearchParams)) {
    return false;
  }

  // Strip protocol and query params.
  urlStr = url.hostname.concat(url.pathname);

  return homepageMatches.domainPath.test(urlStr);
}

async function lastBrowserUpdateDate() {
  // Get the newest update in the update history. This isn't perfect
  // because these dates are when updates are applied, not when the
  // user restarts with the update. See bug 1595328.
  if (lazy.updateManager && lazy.updateManager.getUpdateCount()) {
    let update = lazy.updateManager.getUpdateAt(0);
    return update.installDate;
  }
  // Fall back to the profile age.
  let age = await lazy.ProfileAge();
  return (await age.firstUse) || age.created;
}

export var UrlbarProviderSearchTips = new ProviderSearchTips();
