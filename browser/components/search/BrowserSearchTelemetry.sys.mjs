/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  ContextId: "moz-src:///browser/modules/ContextId.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SearchSERPTelemetry:
    "moz-src:///browser/components/search/SearchSERPTelemetry.sys.mjs",
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
});

/**
 * @import {SearchEngine} from "moz-src:///toolkit/components/search/SearchEngine.sys.mjs"
 */

/**
 * This class handles saving search telemetry related to the url bar,
 * search bar and other areas as per the sources above.
 */
class BrowserSearchTelemetryHandler {
  /**
   * A map of known search origins. The keys of this map are the current valid
   * search access point sources for search telemetry. The values of this map are
   * used for deprecated telemetry probes.
   *
   * If adding to this set of sources, the probes listed below should also be
   * updated for what they report, including the list of bug ids.
   *
   * The current list of probes that use these sources are (note: these are listed
   * in the Glean snake_case format that the yaml files use):
   *
   * - sap.counts
   * - sap.deprecated_counts (deprecated), and associated SEARCH_COUNTS histogram
   * - sap.search_form_counts
   * - sap.impression_counts (currently only used for context menu items)
   * - serp.impression
   * - browser.engagement.navigation.*
   * - browser.search.content.* (deprecated, some may need to be mirrored)
   * - browser.search.withads.* (deprecated, some may need to be mirrored)
   * - browser.search.adclicks.* (deprecated, some may need to be mirrored)
   *
   * When legacy telemetry stops being reported, we should replace this map with
   * an array of strings - We still want to keep a list of valid sources, to
   * help ensure that telemetry reporting is updated correctly if new sources
   * are added.
   *
   * To aid searching for where the sources are used, the sources are maintained
   * in snake_case which is how they are reported via telemetry.
   */
  KNOWN_SEARCH_SOURCES = Object.freeze({
    about_home: "abouthome",
    contextmenu: "contextmenu",
    contextmenu_visual: "contextmenu_visual",
    about_newtab: "newtab",
    searchbar: "searchbar",
    smartbar: "smartbar",
    smartwindow_assistant: "smartwindow_assistant",
    system: "system",
    urlbar: "urlbar",
    urlbar_handoff: "urlbar-handoff",
    urlbar_persisted: "urlbar-persisted",
    urlbar_searchmode: "urlbar-searchmode",
    webextension: "webextension",
  });

  /**
   * Determines if we should record a search for this browser instance.
   * Private Browsing mode is normally skipped.
   *
   * @param {MozBrowser} browser
   *   The browser where the search was loaded.
   * @returns {boolean}
   *   True if the search should be recorded, false otherwise.
   */
  shouldRecordSearchCount(browser) {
    return (
      !lazy.PrivateBrowsingUtils.isWindowPrivate(browser.ownerGlobal) ||
      !Services.prefs.getBoolPref("browser.engagement.search_counts.pbm", false)
    );
  }

  /**
   * Records the method by which the user selected a result from the searchbar.
   *
   * @param {Event} event
   *        The event that triggered the selection.
   * @param {number} index
   *        The index that the user chose in the popup, or -1 if there wasn't a
   *        selection.
   */
  recordSearchSuggestionSelectionMethod(event, index) {
    // command events are from the one-off context menu. Treat them as clicks.
    // Note that we only care about MouseEvent subclasses here when the
    // event type is "click", or else the subclasses are associated with
    // non-click interactions.
    let isClick =
      event &&
      (ChromeUtils.getClassName(event) == "MouseEvent" ||
        event.type == "click" ||
        event.type == "command");
    let category;
    if (isClick) {
      category = "click";
    } else if (index >= 0) {
      category = "enterSelection";
    } else {
      category = "enter";
    }

    Glean.searchbar.selectedResultMethod[category].add(1);
  }

  /**
   * Records entry into the Urlbar's search mode.
   *
   * Telemetry records only which search mode is entered and how it was entered.
   * It does not record anything pertaining to searches made within search mode.
   *
   * @param {object} searchMode
   *   A search mode object. See UrlbarInput.setSearchMode documentation for
   *   details.
   */
  recordSearchMode(searchMode) {
    // Search mode preview is not search mode. Recording it would just create
    // noise.
    if (searchMode.isPreview) {
      return;
    }

    let label = lazy.UrlbarSearchUtils.getSearchModeScalarKey(searchMode);
    let name = searchMode.entry.replace(/_([a-z])/g, (m, p) => p.toUpperCase());
    Glean.urlbarSearchmode[name]?.[label].add(1);
  }

  /**
   * The main entry point for recording search related Telemetry. This includes
   * search counts and engagement measurements.
   *
   * Telemetry records only search counts per engine and action origin, but
   * nothing pertaining to the search contents themselves.
   *
   * @param {MozBrowser} browser
   *        The browser where the search originated.
   * @param {SearchEngine} engine
   *        The engine handling the search.
   * @param {keyof typeof BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES} source
   *        Where the search originated from.
   * @param {object} [details] Options object.
   * @param {boolean} [details.isOneOff=false]
   *        true if this event was generated by a one-off search.
   * @param {boolean} [details.isSuggestion=false]
   *        true if this event was generated by a suggested search.
   * @param {boolean} [details.isFormHistory=false]
   *        true if this event was generated by a form history result.
   * @param {string} [details.alias=null]
   *        The search engine alias used in the search, if any.
   * @param {string} [details.newtabSessionId=undefined]
   *        The newtab session that prompted this search, if any.
   * @param {Values<typeof lazy.SearchUtils.URL_TYPE>} [details.searchUrlType=undefined]
   *        A `SearchUtils.URL_TYPE` value that indicates the type of search.
   *        Defaults to `SearchUtils.URL_TYPE.SEARCH`, a plain old search.
   * @throws if source is not in the known sources list.
   */
  recordSearch(browser, engine, source, details = {}) {
    if (engine.clickUrl) {
      this.#reportSearchInGlean(engine.clickUrl);
    }

    try {
      if (!this.shouldRecordSearchCount(browser)) {
        return;
      }
      if (!(source in this.KNOWN_SEARCH_SOURCES)) {
        console.error("Unknown source for search: ", source);
        return;
      }

      if (source.startsWith("urlbar")) {
        Services.prefs.setIntPref(
          "browser.urlbar.lastUrlbarSearchSeconds",
          Math.round(Date.now() / 1000)
        );
      }

      if (source != "contextmenu_visual") {
        const countIdPrefix = `${engine.telemetryId}.`;
        const countIdSource = countIdPrefix + this.KNOWN_SEARCH_SOURCES[source];

        // NOTE: When removing the sap.deprecatedCounts telemetry, see the note
        // above KNOWN_SEARCH_SOURCES.
        if (
          details.alias &&
          engine.isConfigEngine &&
          engine.aliases.includes(details.alias)
        ) {
          // This is a keyword search using a config engine.
          // Record the source as "alias", not "urlbar".
          Glean.sap.deprecatedCounts[countIdPrefix + "alias"].add();
        } else {
          Glean.sap.deprecatedCounts[countIdSource].add();
        }
      }

      // When an engine is overridden by a third party, then we report the
      // override and skip reporting the partner code, since we don't have
      // a requirement to report the partner code in that case.
      let isOverridden = !!engine.overriddenById;

      let searchUrlType =
        details.searchUrlType ?? lazy.SearchUtils.URL_TYPE.SEARCH;

      // Strict equality is used because we want to only match against the
      // empty string and not other values. We would have `engine.partnerCode`
      // return `undefined`, but the XPCOM interfaces force us to return an
      // empty string.
      let reportPartnerCode =
        !isOverridden &&
        engine.partnerCode !== "" &&
        !engine.getURLOfType(searchUrlType)?.excludePartnerCodeFromTelemetry;

      Glean.sap.counts.record({
        source,
        provider_id: engine.isConfigEngine ? engine.id : "other",
        provider_name: engine.name,
        // If no code is reported, we must returned undefined, Glean will then
        // not report the field.
        partner_code: reportPartnerCode ? engine.partnerCode : undefined,
        overridden_by_third_party: isOverridden.toString(),
      });

      // Dispatch the search signal to other handlers.
      switch (source) {
        case "urlbar":
        case "searchbar":
        case "smartbar":
        case "urlbar_searchmode":
        case "urlbar_persisted":
        case "urlbar_handoff":
          this._handleSearchAndUrlbar(browser, engine, source, details);
          break;
        case "about_home":
        case "about_newtab":
          this.#recordSearch(browser, source, "enter");
          break;
        default:
          this.#recordSearch(browser, source);
          break;
      }
      if (["urlbar_handoff", "about_home", "about_newtab"].includes(source)) {
        Glean.newtabSearch.issued.record({
          newtab_visit_id: details.newtabSessionId,
          search_access_point: source,
          telemetry_id: engine.telemetryId,
        });
        lazy.SearchSERPTelemetry.recordBrowserNewtabSession(
          browser,
          details.newtabSessionId
        );
      }
    } catch (ex) {
      // Catch any errors here, so that search actions are not broken if
      // telemetry is broken for some reason.
      console.error(ex);
    }
  }

  /**
   * Records visits to a search engine's search form.
   *
   * @param {SearchEngine} engine
   *   The engine whose search form is being visited.
   * @param {"searchbar"|"smartbar"|"urlbar"} source
   *   Where the search form was opened from. This is a sub-set of the
   *   KNOWN_SEARCH_SOURCES.
   */
  recordSearchForm(engine, source) {
    Glean.sap.searchFormCounts.record({
      source,
      provider_id: engine.isConfigEngine ? engine.id : "other",
    });
  }

  /**
   * Records an impression of a search access point.
   *
   * @param {MozBrowser} browser
   *   The browser associated with the SAP.
   * @param {SearchEngine|null} engine
   *   The engine handling the search, or null if this doesn't apply to the SAP
   *   (e.g., the engine isn't known or selected yet). The counter's label will
   *   be `engine.id` if `engine` is a non-null, app-provided engine. Otherwise
   *   the label will be "none".
   * @param {keyof typeof BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES} source
   *   The name of the SAP.
   */
  recordSapImpression(browser, engine, source) {
    if (!this.shouldRecordSearchCount(browser)) {
      return;
    }
    if (!(source in this.KNOWN_SEARCH_SOURCES)) {
      console.error("Unknown source for SAP impression:", source);
      return;
    }

    let name = source.replace(/_([a-z])/g, (m, p) => p.toUpperCase());
    let label = engine?.isConfigEngine ? engine.id : "none";
    Glean.sapImpressionCounts[name][label].add(1);
  }

  /**
   * This function handles the "urlbar", "urlbar-oneoff", "searchbar" and
   * "searchbar-oneoff" sources.
   *
   * @param {MozBrowser} browser
   *   The browser where the search originated.
   * @param {SearchEngine} engine
   *   The engine handling the search.
   * @param {keyof typeof BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES} source
   *   Where the search originated from.
   * @param {object} details
   *   See {@link BrowserSearchTelemetryHandler.recordSearch}
   */
  _handleSearchAndUrlbar(browser, engine, source, details) {
    const isOneOff = !!details.isOneOff;
    let action = "enter";
    if (isOneOff) {
      action = "oneoff";
    } else if (details.isFormHistory) {
      action = "formhistory";
    } else if (details.isSuggestion) {
      action = "suggestion";
    } else if (details.alias) {
      action = "alias";
    }

    this.#recordSearch(browser, source, action);
  }

  /**
   * Records source information to the SERP telemetry, and records
   * the browser engagement navigation data.
   *
   * @param {MozBrowser} browser
   * @param {keyof typeof BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES} source
   * @param {string} [action]
   */
  #recordSearch(browser, source, action = null) {
    lazy.SearchSERPTelemetry.recordBrowserSource(browser, source);

    let label = action ? "search_" + action : "search";
    let name = source.replace(/_([a-z])/g, (m, p) => p.toUpperCase());
    Glean.browserEngagementNavigation[name][label].add(1);
  }

  /**
   * Records the search in Glean for contextual services.
   *
   * @param {string} reportingUrl
   *   The url to be sent to contextual services.
   */
  async #reportSearchInGlean(reportingUrl) {
    let defaultValuesByGleanKey = {
      contextId: await lazy.ContextId.request(),
    };

    let sendGleanPing = valuesByGleanKey => {
      valuesByGleanKey = { ...defaultValuesByGleanKey, ...valuesByGleanKey };
      for (let [gleanKey, value] of Object.entries(valuesByGleanKey)) {
        let glean = Glean.searchWith[gleanKey];
        if (value !== undefined && value !== "") {
          glean.set(value);
        }
      }
      GleanPings.searchWith.submit();
    };

    sendGleanPing({
      reportingUrl,
    });
  }
}

export var BrowserSearchTelemetry = new BrowserSearchTelemetryHandler();
