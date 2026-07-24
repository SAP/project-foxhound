/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { SearchEngine } from "moz-src:///toolkit/components/search/SearchEngine.sys.mjs"
 */
const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  OpenSearchManager:
    "moz-src:///browser/components/search/OpenSearchManager.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarSearchUtils:
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs",
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "SearchModeSwitcherL10n", () => {
  return new Localization(["browser/browser.ftl"]);
});
ChromeUtils.defineLazyGetter(lazy, "searchModeNewBadge", () => {
  return lazy.SearchModeSwitcherL10n.formatValue("urlbar-searchmode-new");
});

// Default icon used for engines that do not have icons loaded.
const DEFAULT_ENGINE_ICON =
  "chrome://browser/skin/search-engine-placeholder@2x.png";

/**
 * Implements the SearchModeSwitcher in the urlbar.
 */
export class SearchModeSwitcher {
  static DEFAULT_ICON = lazy.UrlbarUtils.ICON.SEARCH_GLASS;
  static DEFAULT_ICON_KEYWORD_DISABLED = lazy.UrlbarUtils.ICON.GLOBE;
  /**
   * The maximum number of openSearch engines available to install
   * to display.
   */
  static MAX_OPENSEARCH_ENGINES = 3;
  #popup;
  #input;
  #toolbarbutton;

  /**
   * @param {UrlbarInput} input
   */
  constructor(input) {
    this.#input = input;

    this.QueryInterface = ChromeUtils.generateQI([
      "nsIObserver",
      "nsISupportsWeakReference",
    ]);

    lazy.UrlbarPrefs.addObserver(this);

    this.#popup = /** @type {XULPopupElement} */ (
      input.querySelector(".searchmode-switcher-popup")
    );

    this.#toolbarbutton = input.querySelector(".searchmode-switcher");

    if (this.#isEnabled) {
      this.#enableObservers();
    }
  }

  #isEnabled() {
    return (
      lazy.UrlbarPrefs.get("scotchBonnet.enableOverride") ||
      this.#input.sapName == "searchbar"
    );
  }

  async #onPopupShowing() {
    await this.#buildSearchModeList();
    this.#input.view.close({ showFocusBorder: false });

    if (this.#input.sapName == "urlbar") {
      Glean.urlbarUnifiedsearchbutton.opened.add(1);
    }
  }

  /**
   * Close the SearchSwitcher popup.
   */
  closePanel() {
    this.#popup.hidePopup();
  }

  #openPreferences(event) {
    if (
      (event.type == "click" && event.button != 0) ||
      (event.type == "keypress" &&
        event.charCode != KeyEvent.DOM_VK_SPACE &&
        event.keyCode != KeyEvent.DOM_VK_RETURN)
    ) {
      return; // Left click, space or enter only
    }

    event.preventDefault();
    event.stopPropagation();

    this.#input.window.openPreferences("paneSearch");
    this.closePanel();

    if (this.#input.sapName == "urlbar") {
      Glean.urlbarUnifiedsearchbutton.picked.settings.add(1);
    }
  }

  /**
   * Exit the engine specific searchMode.
   *
   * @param {Event} event
   *        The event that triggered the searchMode exit.
   */
  exitSearchMode(event) {
    event.preventDefault();
    this.#input.searchMode = null;
    // Update the result by the default engine.
    this.#input.startQuery();
  }

  /**
   * Called when the value of the searchMode attribute on UrlbarInput is changed.
   */
  onSearchModeChanged() {
    if (!this.#input.window || this.#input.window.closed) {
      return;
    }

    if (this.#isEnabled()) {
      this.updateSearchIcon();

      if (
        this.#input.searchMode?.engineName == "Perplexity" &&
        !lazy.UrlbarPrefs.get("perplexity.hasBeenInSearchMode")
      ) {
        lazy.UrlbarPrefs.set("perplexity.hasBeenInSearchMode", true);
      }
    }
  }

  handleEvent(event) {
    if (event.type == "focus") {
      this.#input.setUnifiedSearchButtonAvailability(true);
      return;
    }
    if (event.type == "popupshowing") {
      this.#toolbarbutton.setAttribute("aria-expanded", "true");
      this.#onPopupShowing();
      return;
    }
    if (event.type == "popuphiding") {
      // This moves the focus to the urlbar when the popup is closed.
      this.#input.document.commandDispatcher.focusedElement =
        this.#input.inputField;
      this.#toolbarbutton.setAttribute("aria-expanded", "false");
      return;
    }
    if (event.type == "keydown") {
      if (this.#input.view.isOpen) {
        // The urlbar view is open, which means the unified search button got
        // focus by tab key from urlbar.
        switch (event.keyCode) {
          case KeyEvent.DOM_VK_TAB: {
            // Move the focus to urlbar view to make cyclable.
            this.#input.focus();
            this.#input.view.selectBy(1, {
              reverse: event.shiftKey,
              userPressedTab: true,
            });
            event.preventDefault();
            return;
          }
          case KeyEvent.DOM_VK_ESCAPE: {
            this.#input.view.close();
            this.#input.focus();
            event.preventDefault();
            return;
          }
        }
      }

      // Manually open the popup on down.
      if (event.keyCode == KeyEvent.DOM_VK_DOWN) {
        this.#popup.openPopup(null, {
          triggerEvent: event,
        });
      }

      return;
    }

    let action = event.currentTarget.dataset.action ?? event.type;

    switch (action) {
      case "exitsearchmode": {
        this.exitSearchMode(event);
        break;
      }
      case "openpreferences": {
        this.#openPreferences(event);
        break;
      }
    }
  }

  observe(_subject, topic, data) {
    if (
      !this.#input.window ||
      this.#input.window.closed ||
      // TODO bug 2005783 stop observing when input is disconnected.
      !this.#input.isConnected
    ) {
      return;
    }

    switch (topic) {
      case "browser-search-engine-modified": {
        if (
          data === "engine-default" ||
          data === "engine-default-private" ||
          data === "engine-icon-changed"
        ) {
          this.updateSearchIcon();
        }
        break;
      }
    }
  }

  /**
   * Called when a urlbar pref changes.
   *
   * @param {string} pref
   *   The name of the pref relative to `browser.urlbar`.
   */
  onPrefChanged(pref) {
    if (!this.#input.window || this.#input.window.closed) {
      return;
    }

    if (this.#input.sapName == "searchbar") {
      // The searchbar cares about neither of the two prefs.
      return;
    }

    switch (pref) {
      case "scotchBonnet.enableOverride": {
        if (lazy.UrlbarPrefs.get("scotchBonnet.enableOverride")) {
          this.#enableObservers();
          this.updateSearchIcon();
        } else {
          this.#disableObservers();
        }
        break;
      }
      case "keyword.enabled": {
        if (lazy.UrlbarPrefs.get("scotchBonnet.enableOverride")) {
          this.updateSearchIcon();
        }
        break;
      }
    }
  }

  /**
   * If the user presses Option+Up or Option+Down we open the engine list.
   *
   * @param {KeyboardEvent} event
   *   The key down event.
   */
  handleKeyDown(event) {
    if (
      (event.keyCode == KeyEvent.DOM_VK_UP ||
        event.keyCode == KeyEvent.DOM_VK_DOWN) &&
      event.altKey
    ) {
      this.#input.controller.focusOnUnifiedSearchButton();
      this.#popup.openPopup(null, {
        triggerEvent: event,
      });
      event.stopPropagation();
      event.preventDefault();
      return true;
    }
    return false;
  }

  async updateSearchIcon() {
    let searchMode = this.#input.searchMode;

    try {
      await lazy.UrlbarSearchUtils.init();
    } catch {
      console.error("Search service failed to init");
    }

    let { label, icon } = await this.#getDisplayedEngineDetails(
      this.#input.searchMode
    );

    if (searchMode?.source != this.#input.searchMode?.source) {
      return;
    }

    const inSearchMode = this.#input.searchMode;
    if (!lazy.UrlbarPrefs.get("unifiedSearchButton.always")) {
      const keywordEnabled = lazy.UrlbarPrefs.get("keyword.enabled");
      if (
        this.#input.sapName != "searchbar" &&
        !keywordEnabled &&
        !inSearchMode
      ) {
        icon = SearchModeSwitcher.DEFAULT_ICON_KEYWORD_DISABLED;
      }
    } else if (!inSearchMode) {
      // Use default icon set in CSS.
      icon = null;
    }

    let iconUrl = icon ? `url(${icon})` : null;
    // Bug 1984069 - This uses an intermediate variable to keep documentation
    // generation happy.
    let element = /** @type {HTMLImageElement} */ (
      this.#input.querySelector(".searchmode-switcher-icon")
    );
    element.style.listStyleImage = iconUrl;

    if (label) {
      this.#input.document.l10n.setAttributes(
        this.#toolbarbutton,
        "urlbar-searchmode-button2",
        { engine: label }
      );
    } else {
      this.#input.document.l10n.setAttributes(
        this.#toolbarbutton,
        "urlbar-searchmode-button-no-engine"
      );
    }

    let labelEl = this.#input.querySelector(".searchmode-switcher-title");

    if (!inSearchMode) {
      labelEl.replaceChildren();
    } else {
      labelEl.textContent = label;
    }

    if (
      !lazy.UrlbarPrefs.get("keyword.enabled") &&
      this.#input.sapName != "searchbar"
    ) {
      this.#input.document.l10n.setAttributes(
        this.#toolbarbutton,
        "urlbar-searchmode-no-keyword"
      );
    }
  }

  async #getSearchModeLabel(source) {
    let mode = lazy.UrlbarUtils.LOCAL_SEARCH_MODES.find(
      m => m.source == source
    );
    let [str] = await lazy.SearchModeSwitcherL10n.formatMessages([
      { id: mode.uiLabel },
    ]);
    return str.attributes[0].value;
  }

  async #getDisplayedEngineDetails(searchMode = null) {
    if (!lazy.SearchService.hasSuccessfullyInitialized) {
      return { label: null, icon: SearchModeSwitcher.DEFAULT_ICON };
    }

    if (!searchMode || searchMode.engineName) {
      let engine = searchMode
        ? lazy.UrlbarSearchUtils.getEngineByName(searchMode.engineName)
        : lazy.UrlbarSearchUtils.getDefaultEngine(
            lazy.PrivateBrowsingUtils.isWindowPrivate(this.#input.window)
          );
      let icon = (await engine.getIconURL()) ?? SearchModeSwitcher.DEFAULT_ICON;
      return { label: engine.name, icon };
    }

    let mode = lazy.UrlbarUtils.LOCAL_SEARCH_MODES.find(
      m => m.source == searchMode.source
    );
    return {
      label: await this.#getSearchModeLabel(searchMode.source),
      icon: mode.icon,
    };
  }

  /**
   * Builds the popup and dispatches a rebuild event on the popup when finished.
   */
  async #buildSearchModeList() {
    // Remove all menuitems added.
    for (let item of this.#popup.querySelectorAll(
      ".searchmode-switcher-addEngine, .searchmode-switcher-installed, .searchmode-switcher-local"
    )) {
      item.remove();
    }

    let browser = this.#input.window.gBrowser;
    let separator = this.#popup.querySelector(
      ".searchmode-switcher-popup-footer-separator"
    );

    let openSearchEngines = lazy.OpenSearchManager.getEngines(
      browser.selectedBrowser
    );
    openSearchEngines = openSearchEngines.slice(
      0,
      SearchModeSwitcher.MAX_OPENSEARCH_ENGINES
    );

    for (let engine of openSearchEngines) {
      let menuitem = this.#createButton(engine.title, engine.icon);
      menuitem.classList.add("searchmode-switcher-addEngine");
      menuitem.addEventListener("command", e => {
        this.#installOpenSearchEngine(e, engine);
      });
      this.#popup.insertBefore(menuitem, separator);
    }

    // Add engines installed.
    let engines = [];
    try {
      engines = await lazy.SearchService.getVisibleEngines();
    } catch {
      console.error("Failed to fetch engines");
    }

    for (let engine of engines) {
      if (engine.hideOneOffButton) {
        continue;
      }
      let icon = await engine.getIconURL();
      let menuitem = this.#createButton(engine.name, icon);
      menuitem.classList.add("searchmode-switcher-installed");
      menuitem.setAttribute("label", engine.name);
      menuitem.setAttribute("closemenu", "none");

      if (engine.isNew() && engine.isAppProvided) {
        menuitem.setAttribute("badge", await lazy.searchModeNewBadge);
        menuitem.classList.add("badge-new");
      }

      menuitem.addEventListener(
        "command",
        /** @param {XULCommandEvent} e */ e => {
          this.search({
            engine,
            whereToOpenSerp: this.#whereToOpenSerp(e),
          });
        }
      );

      this.#popup.insertBefore(menuitem, separator);
    }

    await this.#buildLocalSearchModeList(separator);

    this.#popup.dispatchEvent(new Event("rebuild"));
  }

  /**
   * @param {MouseEvent|KeyboardEvent|XULCommandEvent} event
   * @returns {string|null} Returns where the engine result page should be
   * opened, or null if it should not be opened.
   */
  #whereToOpenSerp(event) {
    let where = lazy.BrowserUtils.whereToOpenLink(event, false, true);
    if (where.startsWith("tab")) {
      return where;
    }
    if (event.shiftKey) {
      return "current";
    }
    return null;
  }

  /**
   * Adds local options to the popup.
   *
   * @param {Element} separator
   */
  async #buildLocalSearchModeList(separator) {
    if (this.#input.sapName != "urlbar") {
      return;
    }

    for (let { source, pref, restrict } of lazy.UrlbarUtils
      .LOCAL_SEARCH_MODES) {
      if (!lazy.UrlbarPrefs.get(pref)) {
        continue;
      }
      let name = lazy.UrlbarUtils.getResultSourceName(source);
      let { icon } = await this.#getDisplayedEngineDetails({
        source,
        pref,
        restrict,
      });
      let menuitem = this.#createButton(name, icon);
      menuitem.id = `search-button-${name}`;
      menuitem.classList.add("searchmode-switcher-local");
      menuitem.addEventListener("command", () => {
        this.search({ restrict });
      });

      this.#input.document.l10n.setAttributes(
        menuitem,
        `urlbar-searchmode-${name}`,
        {
          restrict,
        }
      );

      this.#popup.insertBefore(menuitem, separator);
    }
  }

  /**
   *
   * @param {object} [opts]
   * @param {SearchEngine} [opts.engine]
   * @param {?string} [opts.restrict]
   * @param {?string} [opts.whereToOpenSerp]
   *   If this is null, start a query in the urlbar.
   *   Otherwise, open the SERP in that place.
   */
  search({ engine = null, restrict = null, whereToOpenSerp = null } = {}) {
    if (!whereToOpenSerp || whereToOpenSerp == "current") {
      this.closePanel();
    }

    let search = "";
    /** @type {Parameters<UrlbarInput["search"]>[1]} */
    let opts = null;
    if (engine) {
      search = this.#input.value;
      opts = {
        searchEngine: engine,
        searchModeEntry: "searchbutton",
      };
    } else if (restrict) {
      search = restrict + " " + this.#input.value;
      opts = { searchModeEntry: "searchbutton" };
    }

    if (whereToOpenSerp) {
      this.#input.openEngineHomePage(search, {
        searchEngine: opts.searchEngine,
        where: whereToOpenSerp,
      });
    } else {
      this.#input.search(search, opts);
    }

    if (engine) {
      if (this.#input.sapName == "urlbar") {
        // TODO do we really need to distinguish here?
        Glean.urlbarUnifiedsearchbutton.picked[
          engine.isConfigEngine ? "builtin_search" : "addon_search"
        ].add(1);
      }
    } else if (restrict) {
      if (this.#input.sapName == "urlbar") {
        Glean.urlbarUnifiedsearchbutton.picked.local_search.add(1);
      }
    } else {
      console.warn(
        `Unexpected search: ${JSON.stringify({ engine, restrict, whereToOpenSerp })}`
      );
    }
  }

  #enableObservers() {
    Services.obs.addObserver(this, "browser-search-engine-modified", true);

    this.#toolbarbutton.addEventListener("focus", this);
    this.#toolbarbutton.addEventListener("keydown", this);

    this.#popup.addEventListener("popupshowing", this);
    this.#popup.addEventListener("popuphiding", this);

    let closebutton = this.#input.querySelector(".searchmode-switcher-close");
    closebutton.addEventListener("command", this);

    let prefsbutton = this.#input.querySelector(
      ".searchmode-switcher-popup-search-settings-button"
    );
    prefsbutton.addEventListener("command", this);
  }

  #disableObservers() {
    Services.obs.removeObserver(this, "browser-search-engine-modified");

    this.#toolbarbutton.removeEventListener("focus", this);
    this.#toolbarbutton.removeEventListener("keydown", this);

    this.#popup.removeEventListener("popupshowing", this);
    this.#popup.removeEventListener("popuphiding", this);

    let closebutton = this.#input.querySelector(".searchmode-switcher-close");
    closebutton.removeEventListener("command", this);

    let prefsbutton = this.#input.querySelector(
      ".searchmode-switcher-popup-search-settings-button"
    );
    prefsbutton.removeEventListener("command", this);
  }

  #createButton(label, icon) {
    let menuitem = this.#input.window.document.createXULElement("menuitem");
    menuitem.setAttribute("label", label);
    menuitem.setAttribute("class", "menuitem-iconic");
    menuitem.setAttribute("image", icon ?? DEFAULT_ENGINE_ICON);
    return menuitem;
  }

  async #installOpenSearchEngine(e, engine) {
    let topic = "browser-search-engine-modified";

    let observer = engineObj => {
      Services.obs.removeObserver(observer, topic);
      let eng = lazy.SearchService.getEngineByName(
        engineObj.wrappedJSObject.name
      );
      this.search({
        engine: eng,
        whereToOpenSerp: this.#whereToOpenSerp(e),
      });
    };
    Services.obs.addObserver(observer, topic);

    await lazy.SearchUIUtils.addOpenSearchEngine(
      engine.uri,
      engine.icon,
      this.#input.window.gBrowser.selectedBrowser.browsingContext
    );
  }
}
