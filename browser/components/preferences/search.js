/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from extensionControlled.js */
/* import-globals-from preferences.js */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SearchUIUtils: "resource:///modules/SearchUIUtils.sys.mjs",
});

const PREF_URLBAR_QUICKSUGGEST_BLOCKLIST =
  "browser.urlbar.quicksuggest.blockedDigests";
const PREF_URLBAR_WEATHER_USER_ENABLED = "browser.urlbar.suggest.weather";

Preferences.addAll([
  { id: "browser.search.suggest.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.searches", type: "bool" },
  { id: "browser.search.suggest.enabled.private", type: "bool" },
  { id: "browser.search.widget.inNavBar", type: "bool" },
  { id: "browser.urlbar.showSearchSuggestionsFirst", type: "bool" },
  { id: "browser.urlbar.showSearchTerms.enabled", type: "bool" },
  { id: "browser.search.separatePrivateDefault", type: "bool" },
  { id: "browser.search.separatePrivateDefault.ui.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.trending", type: "bool" },
  { id: "browser.urlbar.trending.featureGate", type: "bool" },
  { id: "browser.urlbar.recentsearches.featureGate", type: "bool" },
  { id: "browser.urlbar.suggest.recentsearches", type: "bool" },
]);

const ENGINE_FLAVOR = "text/x-moz-search-engine";
const SEARCH_TYPE = "default_search";
const SEARCH_KEY = "defaultSearch";

// The name of in built engines that support trending results.
const TRENDING_ENGINES = ["Google"];

var gEngineView = null;

var gSearchPane = {
  init() {
    gEngineView = new EngineView(new EngineStore());
    document.getElementById("engineList").view = gEngineView;
    this.buildDefaultEngineDropDowns().catch(console.error);

    if (
      Services.policies &&
      !Services.policies.isAllowed("installSearchEngine")
    ) {
      document.getElementById("addEnginesBox").hidden = true;
    } else {
      let addEnginesLink = document.getElementById("addEngines");
      addEnginesLink.setAttribute("href", lazy.SearchUIUtils.searchEnginesURL);
    }

    window.addEventListener("click", this);
    window.addEventListener("command", this);
    window.addEventListener("dragstart", this);
    window.addEventListener("keypress", this);
    window.addEventListener("select", this);
    window.addEventListener("dblclick", this);

    Services.obs.addObserver(this, "browser-search-engine-modified");
    Services.obs.addObserver(this, "intl:app-locales-changed");
    window.addEventListener("unload", () => {
      Services.obs.removeObserver(this, "browser-search-engine-modified");
      Services.obs.removeObserver(this, "intl:app-locales-changed");
    });

    let suggestsPref = Preferences.get("browser.search.suggest.enabled");
    let urlbarSuggestsPref = Preferences.get("browser.urlbar.suggest.searches");
    let searchBarPref = Preferences.get("browser.search.widget.inNavBar");
    let privateSuggestsPref = Preferences.get(
      "browser.search.suggest.enabled.private"
    );

    let updateSuggestionCheckboxes =
      this._updateSuggestionCheckboxes.bind(this);
    suggestsPref.on("change", updateSuggestionCheckboxes);
    urlbarSuggestsPref.on("change", updateSuggestionCheckboxes);
    searchBarPref.on("change", updateSuggestionCheckboxes);
    let urlbarSuggests = document.getElementById("urlBarSuggestion");
    urlbarSuggests.addEventListener("command", () => {
      urlbarSuggestsPref.value = urlbarSuggests.checked;
    });
    let suggestionsInSearchFieldsCheckbox = document.getElementById(
      "suggestionsInSearchFieldsCheckbox"
    );
    // We only want to call _updateSuggestionCheckboxes once after updating
    // all prefs.
    suggestionsInSearchFieldsCheckbox.addEventListener("command", () => {
      this._skipUpdateSuggestionCheckboxesFromPrefChanges = true;
      if (!searchBarPref.value) {
        urlbarSuggestsPref.value = suggestionsInSearchFieldsCheckbox.checked;
      }
      suggestsPref.value = suggestionsInSearchFieldsCheckbox.checked;
      this._skipUpdateSuggestionCheckboxesFromPrefChanges = false;
      this._updateSuggestionCheckboxes();
    });
    let privateWindowCheckbox = document.getElementById(
      "showSearchSuggestionsPrivateWindows"
    );
    privateWindowCheckbox.addEventListener("command", () => {
      privateSuggestsPref.value = privateWindowCheckbox.checked;
    });

    setEventListener(
      "browserSeparateDefaultEngine",
      "command",
      this._onBrowserSeparateDefaultEngineChange.bind(this)
    );

    this._initDefaultEngines();
    this._initShowSearchTermsCheckbox();
    this._updateSuggestionCheckboxes();
    this._showAddEngineButton();
    this._initRecentSeachesCheckbox();
    this._initAddressBar();
  },

  /**
   * Initialize the default engine handling. This will hide the private default
   * options if they are not enabled yet.
   */
  _initDefaultEngines() {
    this._separatePrivateDefaultEnabledPref = Preferences.get(
      "browser.search.separatePrivateDefault.ui.enabled"
    );

    this._separatePrivateDefaultPref = Preferences.get(
      "browser.search.separatePrivateDefault"
    );

    const checkbox = document.getElementById("browserSeparateDefaultEngine");
    checkbox.checked = !this._separatePrivateDefaultPref.value;

    this._updatePrivateEngineDisplayBoxes();

    const listener = () => {
      this._updatePrivateEngineDisplayBoxes();
      this.buildDefaultEngineDropDowns().catch(console.error);
    };

    this._separatePrivateDefaultEnabledPref.on("change", listener);
    this._separatePrivateDefaultPref.on("change", listener);
  },

  _initShowSearchTermsCheckbox() {
    let checkbox = document.getElementById("searchShowSearchTermCheckbox");

    // Add Nimbus event to show/hide checkbox.
    let onNimbus = () => {
      checkbox.hidden = !UrlbarPrefs.get("showSearchTermsFeatureGate");
    };
    NimbusFeatures.urlbar.onUpdate(onNimbus);

    // Add observer of Search Bar preference as showSearchTerms
    // can't be shown/hidden while Search Bar is enabled.
    let searchBarPref = Preferences.get("browser.search.widget.inNavBar");
    let updateCheckboxHidden = () => {
      checkbox.hidden =
        !UrlbarPrefs.get("showSearchTermsFeatureGate") || searchBarPref.value;
    };
    searchBarPref.on("change", updateCheckboxHidden);

    // Fire once to initialize.
    onNimbus();
    updateCheckboxHidden();

    window.addEventListener("unload", () => {
      NimbusFeatures.urlbar.offUpdate(onNimbus);
    });
  },

  _updatePrivateEngineDisplayBoxes() {
    const separateEnabled = this._separatePrivateDefaultEnabledPref.value;
    document.getElementById("browserSeparateDefaultEngine").hidden =
      !separateEnabled;

    const separateDefault = this._separatePrivateDefaultPref.value;

    const vbox = document.getElementById("browserPrivateEngineSelection");
    vbox.hidden = !separateEnabled || !separateDefault;
  },

  _onBrowserSeparateDefaultEngineChange(event) {
    this._separatePrivateDefaultPref.value = !event.target.checked;
  },

  _updateSuggestionCheckboxes() {
    if (this._skipUpdateSuggestionCheckboxesFromPrefChanges) {
      return;
    }
    let suggestsPref = Preferences.get("browser.search.suggest.enabled");
    let permanentPB = Services.prefs.getBoolPref(
      "browser.privatebrowsing.autostart"
    );
    let urlbarSuggests = document.getElementById("urlBarSuggestion");
    let suggestionsInSearchFieldsCheckbox = document.getElementById(
      "suggestionsInSearchFieldsCheckbox"
    );
    let positionCheckbox = document.getElementById(
      "showSearchSuggestionsFirstCheckbox"
    );
    let privateWindowCheckbox = document.getElementById(
      "showSearchSuggestionsPrivateWindows"
    );
    let urlbarSuggestsPref = Preferences.get("browser.urlbar.suggest.searches");
    let searchBarPref = Preferences.get("browser.search.widget.inNavBar");

    suggestionsInSearchFieldsCheckbox.checked =
      suggestsPref.value &&
      (searchBarPref.value ? true : urlbarSuggestsPref.value);

    urlbarSuggests.disabled = !suggestsPref.value || permanentPB;
    urlbarSuggests.hidden = !searchBarPref.value;

    privateWindowCheckbox.disabled = !suggestsPref.value;
    privateWindowCheckbox.checked = Preferences.get(
      "browser.search.suggest.enabled.private"
    ).value;
    if (privateWindowCheckbox.disabled) {
      privateWindowCheckbox.checked = false;
    }

    urlbarSuggests.checked = urlbarSuggestsPref.value;
    if (urlbarSuggests.disabled) {
      urlbarSuggests.checked = false;
    }
    if (urlbarSuggests.checked) {
      positionCheckbox.disabled = false;
      // Update the checked state of the show-suggestions-first checkbox.  Note
      // that this does *not* also update its pref, it only checks the box.
      positionCheckbox.checked = Preferences.get(
        positionCheckbox.getAttribute("preference")
      ).value;
    } else {
      positionCheckbox.disabled = true;
      positionCheckbox.checked = false;
    }
    if (
      suggestionsInSearchFieldsCheckbox.checked &&
      !searchBarPref.value &&
      !urlbarSuggests.checked
    ) {
      urlbarSuggestsPref.value = true;
    }

    let permanentPBLabel = document.getElementById(
      "urlBarSuggestionPermanentPBLabel"
    );
    permanentPBLabel.hidden = urlbarSuggests.hidden || !permanentPB;

    this._updateTrendingCheckbox(!suggestsPref.value || permanentPB);
  },

  _showAddEngineButton() {
    let aliasRefresh = Services.prefs.getBoolPref(
      "browser.urlbar.update2.engineAliasRefresh",
      false
    );
    if (aliasRefresh) {
      let addButton = document.getElementById("addEngineButton");
      addButton.hidden = false;
    }
  },

  _initRecentSeachesCheckbox() {
    this._recentSearchesEnabledPref = Preferences.get(
      "browser.urlbar.recentsearches.featureGate"
    );
    let recentSearchesCheckBox = document.getElementById(
      "enableRecentSearches"
    );
    const listener = () => {
      recentSearchesCheckBox.hidden = !this._recentSearchesEnabledPref.value;
    };

    this._recentSearchesEnabledPref.on("change", listener);
    listener();
  },

  async _updateTrendingCheckbox(suggestDisabled) {
    let trendingBox = document.getElementById("showTrendingSuggestionsBox");
    let trendingCheckBox = document.getElementById("showTrendingSuggestions");
    let trendingSupported = TRENDING_ENGINES.includes(
      (await Services.search.getDefault()).name
    );
    trendingBox.hidden = !Preferences.get("browser.urlbar.trending.featureGate")
      .value;
    trendingCheckBox.disabled = suggestDisabled || !trendingSupported;
  },

  /**
   * Builds the default and private engines drop down lists. This is called
   * each time something affects the list of engines.
   */
  async buildDefaultEngineDropDowns() {
    await this._buildEngineDropDown(
      document.getElementById("defaultEngine"),
      (
        await Services.search.getDefault()
      ).name,
      false
    );

    if (this._separatePrivateDefaultEnabledPref.value) {
      await this._buildEngineDropDown(
        document.getElementById("defaultPrivateEngine"),
        (
          await Services.search.getDefaultPrivate()
        ).name,
        true
      );
    }
  },

  // ADDRESS BAR

  /**
   * Initializes the address bar section.
   */
  _initAddressBar() {
    // Update the Firefox Suggest section when its Nimbus config changes.
    let onNimbus = () => this._updateFirefoxSuggestSection();
    NimbusFeatures.urlbar.onUpdate(onNimbus);
    window.addEventListener("unload", () => {
      NimbusFeatures.urlbar.offUpdate(onNimbus);
    });

    // The Firefox Suggest info box potentially needs updating when any of the
    // toggles change.
    let infoBoxPrefs = [
      "browser.urlbar.suggest.quicksuggest.nonsponsored",
      "browser.urlbar.suggest.quicksuggest.sponsored",
      "browser.urlbar.quicksuggest.dataCollection.enabled",
    ];
    for (let pref of infoBoxPrefs) {
      Preferences.get(pref).on("change", () =>
        this._updateFirefoxSuggestInfoBox()
      );
    }

    document.getElementById("clipboardSuggestion").hidden = !UrlbarPrefs.get(
      "clipboard.featureGate"
    );

    this._updateFirefoxSuggestSection(true);
    this._initQuickActionsSection();
  },

  /**
   * Updates the Firefox Suggest section (in the address bar section) depending
   * on whether the user is enrolled in a Firefox Suggest rollout.
   *
   * @param {boolean} [onInit]
   *   Pass true when calling this when initializing the pane.
   */
  _updateFirefoxSuggestSection(onInit = false) {
    let container = document.getElementById("firefoxSuggestContainer");

    if (UrlbarPrefs.get("quickSuggestEnabled")) {
      // Update the l10n IDs of text elements.
      let l10nIdByElementId = {
        locationBarGroupHeader: "addressbar-header-firefox-suggest",
        locationBarSuggestionLabel: "addressbar-suggest-firefox-suggest",
      };
      for (let [elementId, l10nId] of Object.entries(l10nIdByElementId)) {
        let element = document.getElementById(elementId);
        element.dataset.l10nIdOriginal ??= element.dataset.l10nId;
        element.dataset.l10nId = l10nId;
      }

      // Show the container.
      this._updateFirefoxSuggestInfoBox();

      this._updateDismissedSuggestionsStatus();
      Preferences.get(PREF_URLBAR_QUICKSUGGEST_BLOCKLIST).on("change", () =>
        this._updateDismissedSuggestionsStatus()
      );
      Preferences.get(PREF_URLBAR_WEATHER_USER_ENABLED).on("change", () =>
        this._updateDismissedSuggestionsStatus()
      );
      setEventListener("restoreDismissedSuggestions", "command", () =>
        this.restoreDismissedSuggestions()
      );

      container.removeAttribute("hidden");
    } else if (!onInit) {
      // Firefox Suggest is not enabled. This is the default, so to avoid
      // accidentally messing anything up, only modify the doc if we're being
      // called due to a change in the rollout-enabled status (!onInit).
      container.setAttribute("hidden", "true");
      let elementIds = ["locationBarGroupHeader", "locationBarSuggestionLabel"];
      for (let id of elementIds) {
        let element = document.getElementById(id);
        element.dataset.l10nId = element.dataset.l10nIdOriginal;
        delete element.dataset.l10nIdOriginal;
        document.l10n.translateElements([element]);
      }
    }
  },

  /**
   * Updates the Firefox Suggest info box (in the address bar section) depending
   * on the states of the Firefox Suggest toggles.
   */
  _updateFirefoxSuggestInfoBox() {
    let nonsponsored = Preferences.get(
      "browser.urlbar.suggest.quicksuggest.nonsponsored"
    ).value;
    let sponsored = Preferences.get(
      "browser.urlbar.suggest.quicksuggest.sponsored"
    ).value;
    let dataCollection = Preferences.get(
      "browser.urlbar.quicksuggest.dataCollection.enabled"
    ).value;

    // Get the l10n ID of the appropriate text based on the values of the three
    // prefs.
    let l10nId;
    if (nonsponsored && sponsored && dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-all";
    } else if (nonsponsored && sponsored && !dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-nonsponsored-sponsored";
    } else if (nonsponsored && !sponsored && dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-nonsponsored-data";
    } else if (nonsponsored && !sponsored && !dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-nonsponsored";
    } else if (!nonsponsored && sponsored && dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-sponsored-data";
    } else if (!nonsponsored && sponsored && !dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-sponsored";
    } else if (!nonsponsored && !sponsored && dataCollection) {
      l10nId = "addressbar-firefox-suggest-info-data";
    }

    let instance = (this._firefoxSuggestInfoBoxInstance = {});
    let infoBox = document.getElementById("firefoxSuggestInfoBox");
    if (!l10nId) {
      infoBox.hidden = true;
    } else {
      let infoText = document.getElementById("firefoxSuggestInfoText");
      infoText.dataset.l10nId = l10nId;

      // If the info box is currently hidden and we unhide it immediately, it
      // will show its old text until the new text is asyncly fetched and shown.
      // That's ugly, so wait for the fetch to finish before unhiding it.
      document.l10n.translateElements([infoText]).then(() => {
        if (instance == this._firefoxSuggestInfoBoxInstance) {
          infoBox.hidden = false;
        }
      });
    }
  },

  _initQuickActionsSection() {
    let showPref = Preferences.get("browser.urlbar.quickactions.showPrefs");
    let showQuickActionsGroup = () => {
      document.getElementById("quickActionsBox").hidden = !showPref.value;
    };
    showPref.on("change", showQuickActionsGroup);
    showQuickActionsGroup();
  },

  /**
   * Enables/disables the "Restore" button for dismissed Firefox Suggest
   * suggestions.
   */
  _updateDismissedSuggestionsStatus() {
    document.getElementById("restoreDismissedSuggestions").disabled =
      !Services.prefs.prefHasUserValue(PREF_URLBAR_QUICKSUGGEST_BLOCKLIST) &&
      !(
        Services.prefs.prefHasUserValue(PREF_URLBAR_WEATHER_USER_ENABLED) &&
        !Services.prefs.getBoolPref(PREF_URLBAR_WEATHER_USER_ENABLED)
      );
  },

  /**
   * Restores Firefox Suggest suggestions dismissed by the user.
   */
  restoreDismissedSuggestions() {
    Services.prefs.clearUserPref(PREF_URLBAR_QUICKSUGGEST_BLOCKLIST);
    Services.prefs.clearUserPref(PREF_URLBAR_WEATHER_USER_ENABLED);
  },

  /**
   * Builds a drop down menu of search engines.
   *
   * @param {DOMMenuList} list
   *   The menu list element to attach the list of engines.
   * @param {string} currentEngine
   *   The name of the current default engine.
   * @param {boolean} isPrivate
   *   True if we are dealing with the default engine for private mode.
   */
  async _buildEngineDropDown(list, currentEngine, isPrivate) {
    // If the current engine isn't in the list any more, select the first item.
    let engines = gEngineView._engineStore._engines;
    if (!engines.length) {
      return;
    }
    if (!engines.some(e => e.name == currentEngine)) {
      currentEngine = engines[0].name;
    }

    // Now clean-up and rebuild the list.
    list.removeAllItems();
    gEngineView._engineStore._engines.forEach(e => {
      let item = list.appendItem(e.name);
      item.setAttribute(
        "class",
        "menuitem-iconic searchengine-menuitem menuitem-with-favicon"
      );
      if (e.iconURL) {
        item.setAttribute("image", e.iconURL);
      }
      item.engine = e;
      if (e.name == currentEngine) {
        list.selectedItem = item;
      }
    });
  },

  handleEvent(aEvent) {
    switch (aEvent.type) {
      case "dblclick":
        if (aEvent.target.id == "engineChildren") {
          let cell = aEvent.target.parentNode.getCellAt(
            aEvent.clientX,
            aEvent.clientY
          );
          if (cell.col?.id == "engineKeyword") {
            this.startEditingAlias(gEngineView.selectedIndex);
          }
        }
        break;
      case "click":
        if (
          aEvent.target.id != "engineChildren" &&
          !aEvent.target.classList.contains("searchEngineAction")
        ) {
          let engineList = document.getElementById("engineList");
          // We don't want to toggle off selection while editing keyword
          // so proceed only when the input field is hidden.
          // We need to check that engineList.view is defined here
          // because the "click" event listener is on <window> and the
          // view might have been destroyed if the pane has been navigated
          // away from.
          if (engineList.inputField.hidden && engineList.view) {
            let selection = engineList.view.selection;
            if (selection?.count > 0) {
              selection.toggleSelect(selection.currentIndex);
            }
            engineList.blur();
          }
        }
        break;
      case "command":
        switch (aEvent.target.id) {
          case "":
            if (
              aEvent.target.parentNode &&
              aEvent.target.parentNode.parentNode
            ) {
              if (aEvent.target.parentNode.parentNode.id == "defaultEngine") {
                gSearchPane.setDefaultEngine();
              } else if (
                aEvent.target.parentNode.parentNode.id == "defaultPrivateEngine"
              ) {
                gSearchPane.setDefaultPrivateEngine();
              }
            }
            break;
          case "restoreDefaultSearchEngines":
            gSearchPane.onRestoreDefaults();
            break;
          case "removeEngineButton":
            Services.search.removeEngine(
              gEngineView.selectedEngine.originalEngine
            );
            break;
          case "addEngineButton":
            gSubDialog.open(
              "chrome://browser/content/preferences/dialogs/addEngine.xhtml",
              { features: "resizable=no, modal=yes" }
            );
            break;
        }
        break;
      case "dragstart":
        if (aEvent.target.id == "engineChildren") {
          onDragEngineStart(aEvent);
        }
        break;
      case "keypress":
        if (aEvent.target.id == "engineList") {
          gSearchPane.onTreeKeyPress(aEvent);
        }
        break;
      case "select":
        if (aEvent.target.id == "engineList") {
          gSearchPane.onTreeSelect();
        }
        break;
    }
  },

  /**
   * Handle when the app locale is changed.
   */
  async appLocalesChanged() {
    await document.l10n.ready;
    await gEngineView.loadL10nNames();
  },

  /**
   * Update the default engine UI and engine tree view as appropriate when engine changes
   * or locale changes occur.
   *
   * @param {Object} engine
   * @param {string} data
   */
  browserSearchEngineModified(engine, data) {
    engine.QueryInterface(Ci.nsISearchEngine);
    switch (data) {
      case "engine-added":
        gEngineView._engineStore.addEngine(engine);
        gEngineView.rowCountChanged(gEngineView.lastEngineIndex, 1);
        gSearchPane.buildDefaultEngineDropDowns();
        break;
      case "engine-changed":
        gSearchPane.buildDefaultEngineDropDowns();
        gEngineView._engineStore.updateEngine(engine);
        gEngineView.invalidate();
        break;
      case "engine-removed":
        gSearchPane.remove(engine);
        break;
      case "engine-default": {
        // If the user is going through the drop down using up/down keys, the
        // dropdown may still be open (eg. on Windows) when engine-default is
        // fired, so rebuilding the list unconditionally would get in the way.
        let selectedEngine =
          document.getElementById("defaultEngine").selectedItem.engine;
        if (selectedEngine.name != engine.name) {
          gSearchPane.buildDefaultEngineDropDowns();
        }
        gSearchPane._updateSuggestionCheckboxes();
        break;
      }
      case "engine-default-private": {
        if (
          this._separatePrivateDefaultEnabledPref.value &&
          this._separatePrivateDefaultPref.value
        ) {
          // If the user is going through the drop down using up/down keys, the
          // dropdown may still be open (eg. on Windows) when engine-default is
          // fired, so rebuilding the list unconditionally would get in the way.
          const selectedEngine = document.getElementById("defaultPrivateEngine")
            .selectedItem.engine;
          if (selectedEngine.name != engine.name) {
            gSearchPane.buildDefaultEngineDropDowns();
          }
        }
        break;
      }
    }
  },

  /**
   * nsIObserver implementation.
   */
  observe(subject, topic, data) {
    switch (topic) {
      case "intl:app-locales-changed": {
        this.appLocalesChanged();
        break;
      }
      case "browser-search-engine-modified": {
        this.browserSearchEngineModified(subject, data);
        break;
      }
    }
  },

  onTreeSelect() {
    document.getElementById("removeEngineButton").disabled =
      !gEngineView.isEngineSelectedAndRemovable();
  },

  onTreeKeyPress(aEvent) {
    let index = gEngineView.selectedIndex;
    let tree = document.getElementById("engineList");
    if (tree.hasAttribute("editing")) {
      return;
    }

    if (aEvent.charCode == KeyEvent.DOM_VK_SPACE) {
      // Space toggles the checkbox.
      let newValue = !gEngineView.getCellValue(
        index,
        tree.columns.getNamedColumn("engineShown")
      );
      gEngineView.setCellValue(
        index,
        tree.columns.getFirstColumn(),
        newValue.toString()
      );
      // Prevent page from scrolling on the space key.
      aEvent.preventDefault();
    } else {
      let isMac = Services.appinfo.OS == "Darwin";
      if (
        (isMac && aEvent.keyCode == KeyEvent.DOM_VK_RETURN) ||
        (!isMac && aEvent.keyCode == KeyEvent.DOM_VK_F2)
      ) {
        this.startEditingAlias(index);
      } else if (
        aEvent.keyCode == KeyEvent.DOM_VK_DELETE ||
        (isMac &&
          aEvent.shiftKey &&
          aEvent.keyCode == KeyEvent.DOM_VK_BACK_SPACE &&
          gEngineView.isEngineSelectedAndRemovable())
      ) {
        // Delete and Shift+Backspace (Mac) removes selected engine.
        Services.search.removeEngine(gEngineView.selectedEngine.originalEngine);
      }
    }
  },

  startEditingAlias(index) {
    // Local shortcut aliases can't be edited.
    if (gEngineView._getLocalShortcut(index)) {
      return;
    }

    let tree = document.getElementById("engineList");
    let engine = gEngineView._engineStore.engines[index];
    tree.startEditing(index, tree.columns.getLastColumn());
    tree.inputField.value = engine.alias || "";
    tree.inputField.select();
  },

  async onRestoreDefaults() {
    let num = await gEngineView._engineStore.restoreDefaultEngines();
    gEngineView.rowCountChanged(0, num);
    gEngineView.invalidate();
  },

  showRestoreDefaults(aEnable) {
    document.getElementById("restoreDefaultSearchEngines").disabled = !aEnable;
  },

  remove(aEngine) {
    let index = gEngineView._engineStore.removeEngine(aEngine);
    if (!gEngineView.tree) {
      // Only update the selection if it's visible in the UI.
      return;
    }

    gEngineView.rowCountChanged(index, -1);
    gEngineView.invalidate();

    gEngineView.selection.select(Math.min(index, gEngineView.rowCount - 1));
    gEngineView.ensureRowIsVisible(gEngineView.currentIndex);

    document.getElementById("engineList").focus();
  },

  async editKeyword(aEngine, aNewKeyword) {
    let keyword = aNewKeyword.trim();
    if (keyword) {
      let eduplicate = false;
      let dupName = "";

      // Check for duplicates in Places keywords.
      let bduplicate = !!(await PlacesUtils.keywords.fetch(keyword));

      // Check for duplicates in changes we haven't committed yet
      let engines = gEngineView._engineStore.engines;
      let lc_keyword = keyword.toLocaleLowerCase();
      for (let engine of engines) {
        if (
          engine.alias &&
          engine.alias.toLocaleLowerCase() == lc_keyword &&
          engine.name != aEngine.name
        ) {
          eduplicate = true;
          dupName = engine.name;
          break;
        }
      }

      // Notify the user if they have chosen an existing engine/bookmark keyword
      if (eduplicate || bduplicate) {
        let msgids = [{ id: "search-keyword-warning-title" }];
        if (eduplicate) {
          msgids.push({
            id: "search-keyword-warning-engine",
            args: { name: dupName },
          });
        } else {
          msgids.push({ id: "search-keyword-warning-bookmark" });
        }

        let [dtitle, msg] = await document.l10n.formatValues(msgids);

        Services.prompt.alert(window, dtitle, msg);
        return false;
      }
    }

    gEngineView._engineStore.changeEngine(aEngine, "alias", keyword);
    gEngineView.invalidate();
    return true;
  },

  async setDefaultEngine() {
    await Services.search.setDefault(
      document.getElementById("defaultEngine").selectedItem.engine,
      Ci.nsISearchService.CHANGE_REASON_USER
    );
    if (ExtensionSettingsStore.getSetting(SEARCH_TYPE, SEARCH_KEY) !== null) {
      ExtensionSettingsStore.select(
        ExtensionSettingsStore.SETTING_USER_SET,
        SEARCH_TYPE,
        SEARCH_KEY
      );
    }
  },

  async setDefaultPrivateEngine() {
    await Services.search.setDefaultPrivate(
      document.getElementById("defaultPrivateEngine").selectedItem.engine,
      Ci.nsISearchService.CHANGE_REASON_USER
    );
  },
};

function onDragEngineStart(event) {
  var selectedIndex = gEngineView.selectedIndex;

  // Local shortcut rows can't be dragged or re-ordered.
  if (gEngineView._getLocalShortcut(selectedIndex)) {
    event.preventDefault();
    return;
  }

  var tree = document.getElementById("engineList");
  let cell = tree.getCellAt(event.clientX, event.clientY);
  if (selectedIndex >= 0 && !gEngineView.isCheckBox(cell.row, cell.col)) {
    event.dataTransfer.setData(ENGINE_FLAVOR, selectedIndex.toString());
    event.dataTransfer.effectAllowed = "move";
  }
}

function EngineStore() {
  this._engines = [];
  this._defaultEngines = [];
  Promise.all([
    Services.search.getVisibleEngines(),
    Services.search.getAppProvidedEngines(),
  ]).then(([visibleEngines, defaultEngines]) => {
    for (let engine of visibleEngines) {
      this.addEngine(engine);
      gEngineView.rowCountChanged(gEngineView.lastEngineIndex, 1);
    }
    this._defaultEngines = defaultEngines.map(this._cloneEngine, this);
    gSearchPane.buildDefaultEngineDropDowns();

    // check if we need to disable the restore defaults button
    var someHidden = this._defaultEngines.some(e => e.hidden);
    gSearchPane.showRestoreDefaults(someHidden);
  });
}
EngineStore.prototype = {
  _engines: null,
  _defaultEngines: null,

  get engines() {
    return this._engines;
  },
  set engines(val) {
    this._engines = val;
  },

  _getIndexForEngine(aEngine) {
    return this._engines.indexOf(aEngine);
  },

  _getEngineByName(aName) {
    return this._engines.find(engine => engine.name == aName);
  },

  _cloneEngine(aEngine) {
    var clonedObj = {
      iconURL: aEngine.getIconURL(),
    };
    for (let i of ["id", "name", "alias", "hidden"]) {
      clonedObj[i] = aEngine[i];
    }
    clonedObj.originalEngine = aEngine;
    return clonedObj;
  },

  // Callback for Array's some(). A thisObj must be passed to some()
  _isSameEngine(aEngineClone) {
    return aEngineClone.originalEngine.id == this.originalEngine.id;
  },

  addEngine(aEngine) {
    this._engines.push(this._cloneEngine(aEngine));
  },

  updateEngine(newEngine) {
    let engineToUpdate = this._engines.findIndex(
      e => e.originalEngine.id == newEngine.id
    );
    if (engineToUpdate != -1) {
      this.engines[engineToUpdate] = this._cloneEngine(newEngine);
    }
  },

  moveEngine(aEngine, aNewIndex) {
    if (aNewIndex < 0 || aNewIndex > this._engines.length - 1) {
      throw new Error("ES_moveEngine: invalid aNewIndex!");
    }
    var index = this._getIndexForEngine(aEngine);
    if (index == -1) {
      throw new Error("ES_moveEngine: invalid engine?");
    }

    if (index == aNewIndex) {
      return Promise.resolve();
    } // nothing to do

    // Move the engine in our internal store
    var removedEngine = this._engines.splice(index, 1)[0];
    this._engines.splice(aNewIndex, 0, removedEngine);

    return Services.search.moveEngine(aEngine.originalEngine, aNewIndex);
  },

  removeEngine(aEngine) {
    if (this._engines.length == 1) {
      throw new Error("Cannot remove last engine!");
    }

    let engineName = aEngine.name;
    let index = this._engines.findIndex(element => element.name == engineName);

    if (index == -1) {
      throw new Error("invalid engine?");
    }

    this._engines.splice(index, 1)[0];

    if (aEngine.isAppProvided) {
      gSearchPane.showRestoreDefaults(true);
    }
    gSearchPane.buildDefaultEngineDropDowns();
    return index;
  },

  async restoreDefaultEngines() {
    var added = 0;

    for (var i = 0; i < this._defaultEngines.length; ++i) {
      var e = this._defaultEngines[i];

      // If the engine is already in the list, just move it.
      if (this._engines.some(this._isSameEngine, e)) {
        await this.moveEngine(this._getEngineByName(e.name), i);
      } else {
        // Otherwise, add it back to our internal store

        // The search service removes the alias when an engine is hidden,
        // so clear any alias we may have cached before unhiding the engine.
        e.alias = "";

        this._engines.splice(i, 0, e);
        let engine = e.originalEngine;
        engine.hidden = false;
        await Services.search.moveEngine(engine, i);
        added++;
      }
    }

    // We can't do this as part of the loop above because the indices are
    // used for moving engines.
    let policyRemovedEngineNames =
      Services.policies.getActivePolicies()?.SearchEngines?.Remove || [];
    for (let engineName of policyRemovedEngineNames) {
      let engine = Services.search.getEngineByName(engineName);
      if (engine) {
        try {
          await Services.search.removeEngine(engine);
        } catch (ex) {
          // Engine might not exist
        }
      }
    }

    Services.search.resetToAppDefaultEngine();
    gSearchPane.showRestoreDefaults(false);
    gSearchPane.buildDefaultEngineDropDowns();
    return added;
  },

  changeEngine(aEngine, aProp, aNewValue) {
    var index = this._getIndexForEngine(aEngine);
    if (index == -1) {
      throw new Error("invalid engine?");
    }

    this._engines[index][aProp] = aNewValue;
    aEngine.originalEngine[aProp] = aNewValue;
  },
};

function EngineView(aEngineStore) {
  this._engineStore = aEngineStore;

  UrlbarPrefs.addObserver(this);

  this.loadL10nNames();
}

EngineView.prototype = {
  _engineStore: null,
  tree: null,

  loadL10nNames() {
    // This maps local shortcut sources to their l10n names.  The names are needed
    // by getCellText.  Getting the names is async but getCellText is not, so we
    // cache them here to retrieve them syncronously in getCellText.
    this._localShortcutL10nNames = new Map();
    return document.l10n
      .formatValues(
        UrlbarUtils.LOCAL_SEARCH_MODES.map(mode => {
          let name = UrlbarUtils.getResultSourceName(mode.source);
          return { id: `urlbar-search-mode-${name}` };
        })
      )
      .then(names => {
        for (let { source } of UrlbarUtils.LOCAL_SEARCH_MODES) {
          this._localShortcutL10nNames.set(source, names.shift());
        }
        // Invalidate the tree now that we have the names in case getCellText was
        // called before name retrieval finished.
        this.invalidate();
      });
  },

  get lastEngineIndex() {
    return this._engineStore.engines.length - 1;
  },

  get selectedIndex() {
    var seln = this.selection;
    if (seln.getRangeCount() > 0) {
      var min = {};
      seln.getRangeAt(0, min, {});
      return min.value;
    }
    return -1;
  },

  get selectedEngine() {
    return this._engineStore.engines[this.selectedIndex];
  },

  // Helpers
  rowCountChanged(index, count) {
    if (this.tree) {
      this.tree.rowCountChanged(index, count);
    }
  },

  invalidate() {
    this.tree?.invalidate();
  },

  ensureRowIsVisible(index) {
    this.tree.ensureRowIsVisible(index);
  },

  getSourceIndexFromDrag(dataTransfer) {
    return parseInt(dataTransfer.getData(ENGINE_FLAVOR));
  },

  isCheckBox(index, column) {
    return column.id == "engineShown";
  },

  isEngineSelectedAndRemovable() {
    let defaultEngine = Services.search.defaultEngine;
    let defaultPrivateEngine = Services.search.defaultPrivateEngine;
    // We don't allow the last remaining engine to be removed, thus the
    // `this.lastEngineIndex != 0` check.
    // We don't allow the default engine to be removed.
    return (
      this.selectedIndex != -1 &&
      this.lastEngineIndex != 0 &&
      !this._getLocalShortcut(this.selectedIndex) &&
      this.selectedEngine.name != defaultEngine.name &&
      this.selectedEngine.name != defaultPrivateEngine.name
    );
  },

  /**
   * Returns the local shortcut corresponding to a tree row, or null if the row
   * is not a local shortcut.
   *
   * @param {number} index
   *   The tree row index.
   * @returns {object}
   *   The local shortcut object or null if the row is not a local shortcut.
   */
  _getLocalShortcut(index) {
    let engineCount = this._engineStore.engines.length;
    if (index < engineCount) {
      return null;
    }
    return UrlbarUtils.LOCAL_SEARCH_MODES[index - engineCount];
  },

  /**
   * Called by UrlbarPrefs when a urlbar pref changes.
   *
   * @param {string} pref
   *   The name of the pref relative to the browser.urlbar branch.
   */
  onPrefChanged(pref) {
    // If one of the local shortcut prefs was toggled, toggle its row's
    // checkbox.
    let parts = pref.split(".");
    if (parts[0] == "shortcuts" && parts[1] && parts.length == 2) {
      this.invalidate();
    }
  },

  // nsITreeView
  get rowCount() {
    return (
      this._engineStore.engines.length + UrlbarUtils.LOCAL_SEARCH_MODES.length
    );
  },

  getImageSrc(index, column) {
    if (column.id == "engineName") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return shortcut.icon;
      }

      if (this._engineStore.engines[index].iconURL) {
        return this._engineStore.engines[index].iconURL;
      }

      if (window.devicePixelRatio > 1) {
        return "chrome://browser/skin/search-engine-placeholder@2x.png";
      }
      return "chrome://browser/skin/search-engine-placeholder.png";
    }

    return "";
  },

  getCellText(index, column) {
    if (column.id == "engineName") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return this._localShortcutL10nNames.get(shortcut.source) || "";
      }
      return this._engineStore.engines[index].name;
    } else if (column.id == "engineKeyword") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return shortcut.restrict;
      }
      return this._engineStore.engines[index].originalEngine.aliases.join(", ");
    }
    return "";
  },

  setTree(tree) {
    this.tree = tree;
  },

  canDrop(targetIndex, orientation, dataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(dataTransfer);
    return (
      sourceIndex != -1 &&
      sourceIndex != targetIndex &&
      sourceIndex != targetIndex + orientation &&
      // Local shortcut rows can't be dragged or dropped on.
      targetIndex < this._engineStore.engines.length
    );
  },

  async drop(dropIndex, orientation, dataTransfer) {
    // Local shortcut rows can't be dragged or dropped on.  This can sometimes
    // be reached even though canDrop returns false for these rows.
    if (this._engineStore.engines.length <= dropIndex) {
      return;
    }

    var sourceIndex = this.getSourceIndexFromDrag(dataTransfer);
    var sourceEngine = this._engineStore.engines[sourceIndex];

    const nsITreeView = Ci.nsITreeView;
    if (dropIndex > sourceIndex) {
      if (orientation == nsITreeView.DROP_BEFORE) {
        dropIndex--;
      }
    } else if (orientation == nsITreeView.DROP_AFTER) {
      dropIndex++;
    }

    await this._engineStore.moveEngine(sourceEngine, dropIndex);
    gSearchPane.showRestoreDefaults(true);
    gSearchPane.buildDefaultEngineDropDowns();

    // Redraw, and adjust selection
    this.invalidate();
    this.selection.select(dropIndex);
  },

  selection: null,
  getRowProperties(index) {
    return "";
  },
  getCellProperties(index, column) {
    if (column.id == "engineName") {
      // For local shortcut rows, return the result source name so we can style
      // the icons in CSS.
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return UrlbarUtils.getResultSourceName(shortcut.source);
      }
    }
    return "";
  },
  getColumnProperties(column) {
    return "";
  },
  isContainer(index) {
    return false;
  },
  isContainerOpen(index) {
    return false;
  },
  isContainerEmpty(index) {
    return false;
  },
  isSeparator(index) {
    return false;
  },
  isSorted(index) {
    return false;
  },
  getParentIndex(index) {
    return -1;
  },
  hasNextSibling(parentIndex, index) {
    return false;
  },
  getLevel(index) {
    return 0;
  },
  getCellValue(index, column) {
    if (column.id == "engineShown") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return UrlbarPrefs.get(shortcut.pref);
      }
      return !this._engineStore.engines[index].originalEngine.hideOneOffButton;
    }
    return undefined;
  },
  toggleOpenState(index) {},
  cycleHeader(column) {},
  selectionChanged() {},
  cycleCell(row, column) {},
  isEditable(index, column) {
    return (
      column.id != "engineName" &&
      (column.id == "engineShown" || !this._getLocalShortcut(index))
    );
  },
  setCellValue(index, column, value) {
    if (column.id == "engineShown") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        UrlbarPrefs.set(shortcut.pref, value == "true");
        this.invalidate();
        return;
      }
      this._engineStore.engines[index].originalEngine.hideOneOffButton =
        value != "true";
      gEngineView.invalidate();
    }
  },
  setCellText(index, column, value) {
    if (column.id == "engineKeyword") {
      gSearchPane
        .editKeyword(this._engineStore.engines[index], value)
        .then(valid => {
          if (!valid) {
            gSearchPane.startEditingAlias(index);
          }
        });
    }
  },
};
