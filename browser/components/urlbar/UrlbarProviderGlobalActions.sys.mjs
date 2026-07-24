/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports a provider that returns all the available
 * global actions for a query.
 */

import {
  UrlbarProvider,
  UrlbarUtils,
} from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

const lazy = {};

// Default icon shown for actions if no custom one is provided.
const DEFAULT_ICON = "chrome://global/skin/icons/settings.svg";
const DYNAMIC_TYPE_NAME = "actions";

// The suggestion index of the actions row within the urlbar results.
const SUGGESTED_INDEX = 1;
const SUGGESTED_INDEX_TABS_MODE = 0;

const SCOTCH_BONNET_PREF = "scotchBonnet.enableOverride";
const ACTIONS_PREF = "secondaryActions.featureGate";
const QUICK_ACTIONS_PREF = "suggest.quickactions";
const MAX_ACTIONS_PREF = "secondaryActions.maxActionsShown";

// Prefs relating to the onboarding label shown to new users.
const TIMES_TO_SHOW_PREF = "quickactions.timesToShowOnboardingLabel";
const TIMES_SHOWN_PREF = "quickactions.timesShownOnboardingLabel";

ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarResult: "moz-src:///browser/components/urlbar/UrlbarResult.sys.mjs",
});

import { ActionsProviderQuickActions } from "moz-src:///browser/components/urlbar/ActionsProviderQuickActions.sys.mjs";
import { ActionsProviderContextualSearch } from "moz-src:///browser/components/urlbar/ActionsProviderContextualSearch.sys.mjs";
import { ActionsProviderTabGroups } from "moz-src:///browser/components/urlbar/ActionsProviderTabGroups.sys.mjs";

let globalActionsProviders = [
  ActionsProviderContextualSearch,
  ActionsProviderQuickActions,
  ActionsProviderTabGroups,
];

/**
 * A provider that lets the user view all available global actions for a query.
 */
export class UrlbarProviderGlobalActions extends UrlbarProvider {
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
      (lazy.UrlbarPrefs.get(SCOTCH_BONNET_PREF) ||
        lazy.UrlbarPrefs.get(ACTIONS_PREF) ||
        queryContext.sapName == "searchbar") &&
      lazy.UrlbarPrefs.get(QUICK_ACTIONS_PREF)
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
    let actionsResults = [];

    for (let provider of globalActionsProviders) {
      if (provider.isActive(queryContext)) {
        for (let action of (await provider.queryActions(queryContext)) || []) {
          action.providerName = provider.name;
          actionsResults.push(action);
        }
      }
    }

    if (!actionsResults.length) {
      return;
    }

    if (actionsResults.length > lazy.UrlbarPrefs.get(MAX_ACTIONS_PREF)) {
      actionsResults.length = lazy.UrlbarPrefs.get(MAX_ACTIONS_PREF);
    }

    let showOnboardingLabel =
      lazy.UrlbarPrefs.get(TIMES_TO_SHOW_PREF) >
      lazy.UrlbarPrefs.get(TIMES_SHOWN_PREF);

    let query = actionsResults.some(a => a.key == "matched-contextual-search")
      ? ""
      : queryContext.searchString;

    let payload = {
      actionsResults,
      dynamicType: DYNAMIC_TYPE_NAME,
      inputLength: queryContext.searchString.length,
      input: query,
      showOnboardingLabel,
      query,
    };

    let result = new lazy.UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.DYNAMIC,
      source: UrlbarUtils.RESULT_SOURCE.ACTIONS,
      suggestedIndex:
        queryContext.restrictSource == UrlbarUtils.RESULT_SOURCE.TABS
          ? SUGGESTED_INDEX_TABS_MODE
          : SUGGESTED_INDEX,
      payload,
    });
    addCallback(this, result);
  }

  onSelection(result, element) {
    let key = element.dataset.action;
    let action = result.payload.actionsResults.find(a => a.key == key);
    action.onSelection?.(result, element);
  }

  onEngagement(queryContext, controller, details) {
    let key = details.element.dataset.action;
    let action = details.result.payload.actionsResults.find(a => a.key == key);
    let options = action.onPick(queryContext, controller);
    if (options?.focusContent) {
      details.element.ownerGlobal.gBrowser.selectedBrowser.focus();
    }
    controller.view.close();
  }

  onSearchSessionEnd(queryContext, controller, details) {
    let showOnboardingLabel = queryContext.results?.find(
      r => r.providerName == this.name
    )?.payload.showOnboardingLabel;
    if (showOnboardingLabel) {
      lazy.UrlbarPrefs.set(
        TIMES_SHOWN_PREF,
        lazy.UrlbarPrefs.get(TIMES_SHOWN_PREF) + 1
      );
    }
    for (let provider of globalActionsProviders) {
      provider.onSearchSessionEnd?.(queryContext, controller, details);
    }
  }

  getViewTemplate(result) {
    let children = result.payload.actionsResults.map((action, i) => {
      let btn = {
        name: `button-${i}`,
        tag: "span",
        classList: ["urlbarView-action-btn"],
        attributes: {
          inputLength: result.payload.inputLength,
          "data-action": action.key,
          role: "button",
        },
        children: [
          {
            tag: "img",
            attributes: {
              src: action.icon || DEFAULT_ICON,
            },
          },
          {
            name: `label-${i}`,
            tag: "span",
            classList: ["urlbarView-action-btn-label"],
          },
        ],
      };

      if (action.dataset?.style) {
        let style = "";
        for (let [prop, val] of Object.entries(action.dataset.style)) {
          style += `${prop}: ${val};`;
        }
        btn.attributes.style = style;
      }

      if (action.dataset?.providesSearchMode) {
        btn.attributes["data-provides-searchmode"] = "true";
        btn.attributes["data-engine"] = action.engine;
      }

      return btn;
    });

    if (result.payload.showOnboardingLabel) {
      children.unshift({
        name: "press-tab-label",
        tag: "span",
        classList: ["urlbarView-press-tab-label"],
      });
    }

    return { children };
  }

  getViewUpdate(result) {
    let viewUpdate = {};
    if (result.payload.showOnboardingLabel) {
      viewUpdate["press-tab-label"] = {
        l10n: { id: "press-tab-label" },
      };
    }
    result.payload.actionsResults.forEach((action, i) => {
      viewUpdate[`label-${i}`] = {
        l10n: { id: action.l10nId, args: action.l10nArgs },
      };
    });
    return viewUpdate;
  }
}
