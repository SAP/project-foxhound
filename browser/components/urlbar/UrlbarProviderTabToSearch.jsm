/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * This module exports a provider that offers a search engine when the user is
 * typing a search engine domain.
 */

var EXPORTED_SYMBOLS = ["UrlbarProviderTabToSearch"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
XPCOMUtils.defineLazyModuleGetters(this, {
  Services: "resource://gre/modules/Services.jsm",
  UrlbarView: "resource:///modules/UrlbarView.jsm",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.jsm",
  UrlbarProvider: "resource:///modules/UrlbarUtils.jsm",
  UrlbarResult: "resource:///modules/UrlbarResult.jsm",
  UrlbarSearchUtils: "resource:///modules/UrlbarSearchUtils.jsm",
  UrlbarUtils: "resource:///modules/UrlbarUtils.jsm",
});

const DYNAMIC_RESULT_TYPE = "onboardTabToSearch";
const VIEW_TEMPLATE = {
  attributes: {
    role: "group",
    selectable: "true",
  },
  children: [
    {
      name: "no-wrap",
      tag: "span",
      classList: ["urlbarView-no-wrap"],
      children: [
        {
          name: "icon",
          tag: "img",
          classList: ["urlbarView-favicon"],
        },
        {
          name: "text-container",
          tag: "span",
          children: [
            {
              name: "first-row-container",
              tag: "span",
              children: [
                {
                  name: "title",
                  tag: "span",
                  classList: ["urlbarView-title"],
                  children: [
                    {
                      name: "titleStrong",
                      tag: "strong",
                    },
                  ],
                },
                {
                  name: "title-separator",
                  tag: "span",
                  classList: ["urlbarView-title-separator"],
                },
                {
                  name: "action",
                  tag: "span",
                  classList: ["urlbarView-action"],
                  attributes: {
                    "slide-in": true,
                  },
                },
              ],
            },
            {
              name: "description",
              tag: "span",
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Initializes this provider's dynamic result. To be called after the creation
 *  of the provider singleton.
 */
function initializeDynamicResult() {
  UrlbarResult.addDynamicResultType(DYNAMIC_RESULT_TYPE);
  UrlbarView.addDynamicViewTemplate(DYNAMIC_RESULT_TYPE, VIEW_TEMPLATE);
}

/**
 * Class used to create the provider.
 */
class ProviderTabToSearch extends UrlbarProvider {
  constructor() {
    super();
    this.onboardingEnginesShown = new Set();
  }

  /**
   * Returns the name of this provider.
   * @returns {string} the name of this provider.
   */
  get name() {
    return "TabToSearch";
  }

  /**
   * Returns the type of this provider.
   * @returns {integer} one of the types from UrlbarUtils.PROVIDER_TYPE.*
   */
  get type() {
    return UrlbarUtils.PROVIDER_TYPE.PROFILE;
  }

  /**
   * Whether this provider should be invoked for the given context.
   * If this method returns false, the providers manager won't start a query
   * with this provider, to save on resources.
   * @param {UrlbarQueryContext} queryContext The query context object
   * @returns {boolean} Whether this provider should be invoked for the search.
   */
  async isActive(queryContext) {
    return (
      queryContext.searchString &&
      queryContext.tokens.length == 1 &&
      !queryContext.searchMode &&
      UrlbarPrefs.get("update2") &&
      UrlbarPrefs.get("update2.tabToComplete")
    );
  }

  /**
   * Gets the provider's priority.
   * @param {UrlbarQueryContext} queryContext The query context object
   * @returns {number} The provider's priority for the given query.
   */
  getPriority(queryContext) {
    return 0;
  }

  /**
   * This is called only for dynamic result types, when the urlbar view updates
   * the view of one of the results of the provider.  It should return an object
   * describing the view update.
   *
   * @param {UrlbarResult} result The result whose view will be updated.
   * @returns {object} An object describing the view update.
   */
  getViewUpdate(result) {
    return {
      icon: {
        attributes: {
          src: result.payload.icon,
        },
      },
      titleStrong: {
        l10n: {
          id: "urlbar-result-action-search-w-engine",
          args: {
            engine: result.payload.engine,
          },
        },
      },
      action: {
        l10n: {
          id: UrlbarUtils.WEB_ENGINE_NAMES.has(result.payload.engine)
            ? "urlbar-result-action-tabtosearch-web"
            : "urlbar-result-action-tabtosearch-other-engine",
          args: {
            engine: result.payload.engine,
          },
        },
      },
      description: {
        l10n: {
          id: "urlbar-tabtosearch-onboard",
        },
      },
    };
  }

  /**
   * Called when any selectable element in a dynamic result's view is picked.
   *
   * @param {UrlbarResult} result
   *   The result that was picked.
   * @param {Element} element
   *   The element in the result's view that was picked.
   */
  pickResult(result, element) {
    element.ownerGlobal.gURLBar.maybeConfirmSearchModeFromResult({
      result,
      checkValue: false,
    });
  }

  /**
   * Called when a result from the provider is selected. "Selected" refers to
   * the user highlighing the result with the arrow keys/Tab, before it is
   * picked. onSelection is also called when a user clicks a result. In the
   * event of a click, onSelection is called just before pickResult.
   *
   * @param {UrlbarResult} result
   *   The result that was selected.
   * @param {Element} element
   *   The element in the result's view that was selected.
   */
  onSelection(result, element) {
    // We keep track of the number of times the user interacts with
    // tab-to-search onboarding results so we stop showing them after
    // `tabToSearch.onboard.interactionsLeft` interactions.
    // Also do not increment the counter if the result was interacted with less
    // than 5 minutes ago. This is a guard against the user running up the
    // counter by interacting with the same result repeatedly.
    if (
      result.payload.dynamicType &&
      (!this.onboardingInteractionAtTime ||
        this.onboardingInteractionAtTime < Date.now() - 1000 * 60 * 5)
    ) {
      let interactionsLeft = UrlbarPrefs.get(
        "tabToSearch.onboard.interactionsLeft"
      );

      if (interactionsLeft > 0) {
        UrlbarPrefs.set(
          "tabToSearch.onboard.interactionsLeft",
          --interactionsLeft
        );
      }

      this.onboardingInteractionAtTime = Date.now();
    }
  }

  /**
   * Called when the user starts and ends an engagement with the urlbar. We
   * clear onboardingEnginesShown on engagement because we want to record in
   * urlbar.tips once per engagement per engine. This has the unfortunate side
   * effect of recording again when the user re-opens a view with a retained
   * tab-to-search result. This is an acceptable tradeoff for not recording
   * multiple times if the user backspaces autofill but then retypes the engine
   * hostname, yielding the same tab-to-search result.
   *
   * @param {boolean} isPrivate True if the engagement is in a private context.
   * @param {string} state The state of the engagement, one of: start,
   *        engagement, abandonment, discard.
   */
  onEngagement(isPrivate, state) {
    if (!this.onboardingEnginesShown.size) {
      return;
    }

    Services.telemetry.keyedScalarAdd(
      "urlbar.tips",
      "tabtosearch_onboard-shown",
      this.onboardingEnginesShown.size
    );
    this.onboardingEnginesShown.clear();
  }

  /**
   * Defines whether the view should defer user selection events while waiting
   * for the first result from this provider.
   * @returns {boolean} Whether the provider wants to defer user selection
   *          events.
   */
  get deferUserSelection() {
    return true;
  }

  /**
   * Starts querying.
   * @param {object} queryContext The query context object
   * @param {function} addCallback Callback invoked by the provider to add a new
   *        result.
   * @returns {Promise} resolved when the query stops.
   */
  async startQuery(queryContext, addCallback) {
    // enginesForDomainPrefix only matches against engine domains.
    // Remove trailing slashes and www. from the search string and check if the
    // resulting string is worth matching.
    // The muxer will verify that the found result matches the autofilled value.
    let [searchStr] = UrlbarUtils.stripPrefixAndTrim(
      queryContext.searchString,
      {
        stripWww: true,
        trimSlash: true,
      }
    );

    // Add all matching engines. The muxer will pick the one that matches
    // autofill, if any.
    let engines = await UrlbarSearchUtils.enginesForDomainPrefix(searchStr, {
      matchAllDomainLevels: true,
    });

    const onboardingInteractionsLeft = UrlbarPrefs.get(
      "tabToSearch.onboard.interactionsLeft"
    );
    for (let engine of engines) {
      // Set the domain without public suffix as url, it will be used by
      // the muxer to evaluate this result.
      let url = engine.getResultDomain();
      url = url.substr(0, url.length - engine.searchUrlPublicSuffix.length);
      let result;
      if (onboardingInteractionsLeft > 0) {
        result = new UrlbarResult(
          UrlbarUtils.RESULT_TYPE.DYNAMIC,
          UrlbarUtils.RESULT_SOURCE.SEARCH,
          {
            engine: engine.name,
            url,
            keywordOffer: UrlbarUtils.KEYWORD_OFFER.SHOW,
            icon: UrlbarUtils.ICON.SEARCH_GLASS_INVERTED,
            dynamicType: DYNAMIC_RESULT_TYPE,
          }
        );
        result.resultSpan = 2;
      } else {
        result = new UrlbarResult(
          UrlbarUtils.RESULT_TYPE.SEARCH,
          UrlbarUtils.RESULT_SOURCE.SEARCH,
          ...UrlbarResult.payloadAndSimpleHighlights(queryContext.tokens, {
            engine: engine.name,
            url,
            keywordOffer: UrlbarUtils.KEYWORD_OFFER.SHOW,
            icon: UrlbarUtils.ICON.SEARCH_GLASS_INVERTED,
            query: "",
          })
        );
      }

      result.suggestedIndex = 1;
      addCallback(this, result);
    }
  }
}

var UrlbarProviderTabToSearch = new ProviderTabToSearch();
initializeDynamicResult();
