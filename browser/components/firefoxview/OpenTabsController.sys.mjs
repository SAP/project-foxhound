/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextualIdentityService:
    "resource://gre/modules/ContextualIdentityService.sys.mjs",
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
});

export class OpenTabsController {
  /**
   * Checks if a given tab is within a container (contextual identity)
   *
   * @param {MozTabbrowserTab[]} tab
   *   Tab to fetch container info on.
   * @returns {object[]}
   *   Container object.
   */
  #getContainerObj(tab) {
    let userContextId = tab.getAttribute("usercontextid");
    let containerObj = null;
    if (userContextId) {
      containerObj =
        lazy.ContextualIdentityService.getPublicIdentityFromId(userContextId);
    }
    return containerObj;
  }

  /**
   * Gets an array of tab indicators (if any) when normalizing for fxview-tab-list
   *
   * @param {MozTabbrowserTab[]} tab
   *   Tab to fetch container info on.
   * @returns {Array[]}
   *  Array of named tab indicators
   */
  #getIndicatorsForTab(tab) {
    const url = tab.linkedBrowser?.currentURI?.spec || "";
    let tabIndicators = [];
    let hasAttention =
      (tab.pinned &&
        (tab.hasAttribute("attention") || tab.hasAttribute("titlechanged"))) ||
      (!tab.pinned && tab.hasAttribute("attention"));

    if (tab.pinned) {
      tabIndicators.push("pinned");
    }
    if (this.#getContainerObj(tab)) {
      tabIndicators.push("container");
    }
    if (hasAttention) {
      tabIndicators.push("attention");
    }
    if (tab.hasAttribute("soundplaying") && !tab.hasAttribute("muted")) {
      tabIndicators.push("soundplaying");
    }
    if (tab.hasAttribute("muted")) {
      tabIndicators.push("muted");
    }
    if (this.#checkIfPinnedNewTab(url)) {
      tabIndicators.push("pinnedOnNewTab");
    }

    return tabIndicators;
  }

  /**
   * Check if a given url is pinned on the new tab page
   *
   * @param {string} url
   *   url to check
   * @returns {boolean}
   *   is tabbed pinned on new tab page
   */
  #checkIfPinnedNewTab(url) {
    return url && lazy.NewTabUtils.pinnedLinks.isPinned({ url });
  }

  /**
   * Gets the primary l10n id for a tab when normalizing for fxview-tab-list
   *
   * @param {boolean} isRecentBrowsing
   *   Whether the tabs are going to be displayed on the Recent Browsing page or not
   * @param {Array[]} tabIndicators
   *   Array of tab indicators for the given tab
   * @returns {string}
   *  L10n ID string
   */
  getPrimaryL10nId(isRecentBrowsing, tabIndicators) {
    let indicatorL10nId = null;
    if (isRecentBrowsing) {
      return indicatorL10nId;
    }
    if (
      tabIndicators?.includes("pinned") &&
      tabIndicators?.includes("bookmark")
    ) {
      indicatorL10nId = "firefoxview-opentabs-bookmarked-pinned-tab";
    } else if (tabIndicators?.includes("pinned")) {
      indicatorL10nId = "firefoxview-opentabs-pinned-tab";
    } else if (tabIndicators?.includes("bookmark")) {
      indicatorL10nId = "firefoxview-opentabs-bookmarked-tab";
    }
    return indicatorL10nId;
  }

  /**
   * Gets the primary l10n args for a tab when normalizing for fxview-tab-list
   *
   * @param {MozTabbrowserTab[]} tab
   *   Tab to fetch container info on.
   * @param {boolean} isRecentBrowsing
   *   Whether the tabs are going to be displayed on the Recent Browsing page or not
   * @param {string} url
   *   URL for the given tab
   * @returns {string}
   *  L10n ID args
   */
  #getPrimaryL10nArgs(tab, isRecentBrowsing, url) {
    return JSON.stringify({ tabTitle: tab.label, url });
  }

  /**
   * Convert a list of tabs into the format expected by the fxview-tab-list
   * component.
   *
   * @param {MozTabbrowserTab[]} tabs
   *   Tabs to format.
   * @param {boolean} isRecentBrowsing
   *   Whether the tabs are going to be displayed on the Recent Browsing page or not
   * @returns {object[]}
   *   Formatted objects.
   */
  getTabListItems(tabs, isRecentBrowsing) {
    let filtered = tabs?.filter(tab => !tab.closing && !tab.hidden);

    return filtered.map(tab => {
      let tabIndicators = this.#getIndicatorsForTab(tab);
      let containerObj = this.#getContainerObj(tab);
      const url = tab?.linkedBrowser?.currentURI?.spec || "";
      return {
        containerObj,
        indicators: tabIndicators,
        icon: tab.getAttribute("image"),
        primaryL10nId: this.getPrimaryL10nId(isRecentBrowsing, tabIndicators),
        primaryL10nArgs: this.#getPrimaryL10nArgs(tab, isRecentBrowsing, url),
        secondaryL10nId:
          isRecentBrowsing || (!isRecentBrowsing && !tab.pinned)
            ? "fxviewtabrow-options-menu-button"
            : null,
        secondaryL10nArgs:
          isRecentBrowsing || (!isRecentBrowsing && !tab.pinned)
            ? JSON.stringify({ tabTitle: tab.label })
            : null,
        tertiaryL10nId:
          isRecentBrowsing || (!isRecentBrowsing && !tab.pinned)
            ? "fxviewtabrow-close-tab-button"
            : null,
        tertiaryL10nArgs:
          isRecentBrowsing || (!isRecentBrowsing && !tab.pinned)
            ? JSON.stringify({ tabTitle: tab.label })
            : null,
        tabElement: tab,
        time: tab.lastSeenActive,
        title: tab.label,
        url,
      };
    });
  }
}
