/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Keeps the "browser.search.widget.inNavBar" preference synchronized,
 * and ensures persisted widths are updated if the search bar is removed.
 */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { CustomizableUI } from "resource:///modules/CustomizableUI.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUsageTelemetry: "resource:///modules/BrowserUsageTelemetry.sys.mjs",
});

const WIDGET_ID = "search-container";
const PREF_NAME = "browser.search.widget.inNavBar";

export const SearchWidgetTracker = {
  init() {
    this.onWidgetReset = this.onWidgetUndoMove = node => {
      if (node.id == WIDGET_ID) {
        this.syncPreferenceWithWidget();
        this.removePersistedWidths();
      }
    };
    CustomizableUI.addListener(this);
    Services.prefs.addObserver(PREF_NAME, () =>
      this.syncWidgetWithPreference()
    );
    this._updateSearchBarVisibilityBasedOnUsage();
  },

  onWidgetAdded(widgetId, area) {
    if (widgetId == WIDGET_ID && area == CustomizableUI.AREA_NAVBAR) {
      this.syncPreferenceWithWidget();
    }
  },

  onWidgetRemoved(aWidgetId, aArea) {
    if (aWidgetId == WIDGET_ID && aArea == CustomizableUI.AREA_NAVBAR) {
      this.syncPreferenceWithWidget();
      this.removePersistedWidths();
    }
  },

  onAreaNodeRegistered(aArea) {
    // The placement of the widget always takes priority, and the preference
    // should always match the actual placement when the browser starts up - i.e.
    // once the navigation bar has been registered.
    if (aArea == CustomizableUI.AREA_NAVBAR) {
      this.syncPreferenceWithWidget();
    }
  },

  onCustomizeEnd() {
    // onWidgetUndoMove does not fire when the search container is moved back to
    // the customization palette as a result of an undo, so we sync again here.
    this.syncPreferenceWithWidget();
  },

  syncPreferenceWithWidget() {
    Services.prefs.setBoolPref(PREF_NAME, this.widgetIsInNavBar);
  },

  syncWidgetWithPreference() {
    let newValue = Services.prefs.getBoolPref(PREF_NAME);
    if (newValue == this.widgetIsInNavBar) {
      return;
    }

    if (newValue) {
      // The URL bar widget is always present in the navigation toolbar, so we
      // can simply read its position to place the search bar right after it.
      CustomizableUI.addWidgetToArea(
        WIDGET_ID,
        CustomizableUI.AREA_NAVBAR,
        CustomizableUI.getPlacementOfWidget("urlbar-container").position + 1
      );
      lazy.BrowserUsageTelemetry.recordWidgetChange(
        WIDGET_ID,
        CustomizableUI.AREA_NAVBAR,
        "searchpref"
      );
    } else {
      CustomizableUI.removeWidgetFromArea(WIDGET_ID);
      lazy.BrowserUsageTelemetry.recordWidgetChange(
        WIDGET_ID,
        null,
        "searchpref"
      );
    }
  },

  _updateSearchBarVisibilityBasedOnUsage() {
    let searchBarLastUsed = Services.prefs.getStringPref(
      "browser.search.widget.lastUsed",
      ""
    );
    if (searchBarLastUsed) {
      const removeAfterDaysUnused = Services.prefs.getIntPref(
        "browser.search.widget.removeAfterDaysUnused"
      );
      let saerchBarUnusedThreshold =
        removeAfterDaysUnused * 24 * 60 * 60 * 1000;
      if (new Date() - new Date(searchBarLastUsed) > saerchBarUnusedThreshold) {
        Services.prefs.setBoolPref("browser.search.widget.inNavBar", false);
      }
    }
  },

  removePersistedWidths() {
    Services.xulStore.removeValue(
      AppConstants.BROWSER_CHROME_URL,
      WIDGET_ID,
      "width"
    );
    for (let win of CustomizableUI.windows) {
      let searchbar =
        win.document.getElementById(WIDGET_ID) ||
        win.gNavToolbox.palette.querySelector("#" + WIDGET_ID);
      searchbar.removeAttribute("width");
      searchbar.style.removeProperty("width");
    }
  },

  get widgetIsInNavBar() {
    let placement = CustomizableUI.getPlacementOfWidget(WIDGET_ID);
    return placement?.area == CustomizableUI.AREA_NAVBAR;
  },
};
