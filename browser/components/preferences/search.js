/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from extensionControlled.js */
/* import-globals-from preferences.js */

const lazy = XPCOMUtils.declareLazy({
  AddonSearchEngine:
    "moz-src:///toolkit/components/search/AddonSearchEngine.sys.mjs",
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  QuickSuggest: "moz-src:///browser/components/urlbar/QuickSuggest.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
  UserSearchEngine:
    "moz-src:///toolkit/components/search/UserSearchEngine.sys.mjs",
});

/**
 * @import { SearchEngine } from "moz-src:///toolkit/components/search/SearchEngine.sys.mjs"
 */

Preferences.addAll([
  { id: "browser.search.suggest.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.searches", type: "bool" },
  { id: "browser.search.suggest.enabled.private", type: "bool" },
  { id: "browser.urlbar.showSearchSuggestionsFirst", type: "bool" },
  { id: "browser.urlbar.showSearchTerms.enabled", type: "bool" },
  { id: "browser.urlbar.showSearchTerms.featureGate", type: "bool" },
  { id: "browser.search.separatePrivateDefault", type: "bool" },
  { id: "browser.search.separatePrivateDefault.ui.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.trending", type: "bool" },
  { id: "browser.urlbar.trending.featureGate", type: "bool" },
  { id: "browser.urlbar.recentsearches.featureGate", type: "bool" },
  { id: "browser.urlbar.suggest.recentsearches", type: "bool" },
  { id: "browser.urlbar.scotchBonnet.enableOverride", type: "bool" },

  // Suggest Section.
  { id: "browser.urlbar.suggest.bookmark", type: "bool" },
  { id: "browser.urlbar.suggest.clipboard", type: "bool" },
  { id: "browser.urlbar.clipboard.featureGate", type: "bool" },
  { id: "browser.urlbar.suggest.history", type: "bool" },
  { id: "browser.urlbar.suggest.openpage", type: "bool" },
  { id: "browser.urlbar.suggest.topsites", type: "bool" },
  { id: "browser.urlbar.suggest.engines", type: "bool" },
  { id: "browser.urlbar.quickactions.showPrefs", type: "bool" },
  { id: "browser.urlbar.suggest.quickactions", type: "bool" },
  { id: "browser.urlbar.quicksuggest.settingsUi", type: "int" },
  { id: "browser.urlbar.quicksuggest.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.quicksuggest.all", type: "bool" },
  { id: "browser.urlbar.suggest.quicksuggest.sponsored", type: "bool" },
  { id: "browser.urlbar.quicksuggest.online.enabled", type: "bool" },
]);

/**
 * Gets the icon to use for a particular engine, falling back to the placeholder
 * if necessary.
 *
 * @param {SearchEngine} engine
 * @param {number} [width]
 *   The display width of the icon. @see {SearchEngine.getIconURL}
 */
async function getEngineIcon(engine, width) {
  let iconURL = await engine.getIconURL(width);

  return (
    iconURL ??
    (window.devicePixelRatio > 1
      ? "chrome://browser/skin/search-engine-placeholder@2x.png"
      : "chrome://browser/skin/search-engine-placeholder.png")
  );
}

/**
 * Generates the config needed to populate the dropdowns for the user's
 * default search engine and separate private default search engine.
 *
 * @param {object} options
 *   Options for creating the config.
 * @param {string} options.settingId
 *   The id for the particular setting.
 * @param {() => Promise<SearchEngine>} options.getEngine
 *   The method used to get the engine from the Search Service.
 * @param {(id: string) => Promise<void>} options.setEngine
 *   The method used to set a new engine.
 * @returns {PreferencesSettingsConfig}
 */
function createSearchEngineConfig({ settingId, getEngine, setEngine }) {
  return class extends Preferences.AsyncSetting {
    static id = settingId;

    /** @type {{options: PreferencesSettingsConfig[]}} */
    defaultGetControlConfig = { options: [] };

    async get() {
      let engine = await getEngine();
      return engine.id;
    }

    /** @param {string} id */
    async set(id) {
      await setEngine(id);
    }

    async getControlConfig() {
      let engines = await lazy.SearchService.getVisibleEngines();
      let optionsInfo = await Promise.allSettled(
        engines.map(async engine => {
          let url = await getEngineIcon(engine);
          return {
            value: engine.id,
            controlAttrs: { label: engine.name },
            iconSrc: url,
          };
        })
      );

      return {
        options: optionsInfo
          .filter(o => o.status == "fulfilled")
          .map(o => o.value),
      };
    }

    setup() {
      Services.obs.addObserver(this, lazy.SearchUtils.TOPIC_ENGINE_MODIFIED);
      return () =>
        Services.obs.removeObserver(
          this,
          lazy.SearchUtils.TOPIC_ENGINE_MODIFIED
        );
    }

    /**
     * @param {?{wrappedJSObject: SearchEngine}} subject
     * @param {"browser-search-service"|"browser-search-engine-modified"} topic
     * @param {string} _data
     */
    observe(subject, topic, _data) {
      if (topic == lazy.SearchUtils.TOPIC_ENGINE_MODIFIED) {
        // Always emit change for any change that could affect the engine list
        // or default.
        this.emitChange();
      }
    }
  };
}

Preferences.addSetting(
  createSearchEngineConfig({
    settingId: "defaultEngineNormal",
    getEngine: () => lazy.SearchService.getDefault(),
    setEngine: id =>
      lazy.SearchService.setDefault(
        lazy.SearchService.getEngineById(id),
        lazy.SearchService.CHANGE_REASON.USER
      ),
  })
);

Preferences.addSetting({
  id: "scotchBonnetEnabled",
  pref: "browser.urlbar.scotchBonnet.enableOverride",
});

Preferences.addSetting({
  id: "showSearchTermsFeatureGate",
  pref: "browser.urlbar.showSearchTerms.featureGate",
});

Preferences.addSetting({
  id: "searchShowSearchTermCheckbox",
  pref: "browser.urlbar.showSearchTerms.enabled",
  deps: ["scotchBonnetEnabled", "showSearchTermsFeatureGate"],
  visible: ({ scotchBonnetEnabled, showSearchTermsFeatureGate }) => {
    if (lazy.CustomizableUI.getPlacementOfWidget("search-container")) {
      return false;
    }
    return showSearchTermsFeatureGate.value || scotchBonnetEnabled.value;
  },
  setup: onChange => {
    // Add observer of CustomizableUI as showSearchTerms checkbox should be
    // hidden while searchbar is enabled.
    let customizableUIListener = {
      onWidgetAfterDOMChange: node => {
        if (node.id == "search-container") {
          onChange();
        }
      },
    };
    lazy.CustomizableUI.addListener(customizableUIListener);
    return () => lazy.CustomizableUI.removeListener(customizableUIListener);
  },
});

Preferences.addSetting({
  id: "separatePrivateDefaultUI",
  pref: "browser.search.separatePrivateDefault.ui.enabled",
  onUserChange: () => {
    gSearchPane._engineStore.notifyRebuildViews();
  },
});

Preferences.addSetting({
  id: "browserSeparateDefaultEngine",
  pref: "browser.search.separatePrivateDefault",
  deps: ["separatePrivateDefaultUI"],
  visible: ({ separatePrivateDefaultUI }) => {
    return separatePrivateDefaultUI.value;
  },
  onUserChange: () => {
    gSearchPane._engineStore.notifyRebuildViews();
  },
});

Preferences.addSetting(
  createSearchEngineConfig({
    settingId: "defaultPrivateEngine",
    getEngine: () => lazy.SearchService.getDefaultPrivate(),
    setEngine: id =>
      lazy.SearchService.setDefaultPrivate(
        lazy.SearchService.getEngineById(id),
        lazy.SearchService.CHANGE_REASON.USER
      ),
  })
);

Preferences.addSetting({
  id: "searchSuggestionsEnabledPref",
  pref: "browser.search.suggest.enabled",
});

Preferences.addSetting({
  id: "permanentPBEnabledPref",
  pref: "browser.privatebrowsing.autostart",
});

Preferences.addSetting({
  id: "urlbarSuggestionsEnabledPref",
  pref: "browser.urlbar.suggest.searches",
});

Preferences.addSetting({
  id: "trendingFeaturegatePref",
  pref: "browser.urlbar.trending.featureGate",
});

// The show search suggestion box behaves differently depending on whether the
// separate search bar is shown. When the separate search bar is shown, it
// controls just the search suggestion preference, and the
// `urlBarSuggestionCheckbox` handles the urlbar suggestions. When the separate
// search bar is not shown, this checkbox toggles both preferences to ensure
// that the urlbar suggestion preference is set correctly, since that will be
// the only bar visible.
Preferences.addSetting({
  id: "suggestionsInSearchFieldsCheckbox",
  deps: ["searchSuggestionsEnabledPref", "urlbarSuggestionsEnabledPref"],
  get(_, deps) {
    let searchBarVisible =
      !!lazy.CustomizableUI.getPlacementOfWidget("search-container");
    return (
      deps.searchSuggestionsEnabledPref.value &&
      (searchBarVisible || deps.urlbarSuggestionsEnabledPref.value)
    );
  },
  set(newCheckedValue, deps) {
    let searchBarVisible =
      !!lazy.CustomizableUI.getPlacementOfWidget("search-container");
    if (!searchBarVisible) {
      deps.urlbarSuggestionsEnabledPref.value = newCheckedValue;
    }
    deps.searchSuggestionsEnabledPref.value = newCheckedValue;
    return newCheckedValue;
  },
});

Preferences.addSetting({
  id: "urlBarSuggestionCheckbox",
  deps: [
    "urlbarSuggestionsEnabledPref",
    "suggestionsInSearchFieldsCheckbox",
    "searchSuggestionsEnabledPref",
    "permanentPBEnabledPref",
  ],
  get: (_, deps) => {
    let searchBarVisible =
      !!lazy.CustomizableUI.getPlacementOfWidget("search-container");
    if (
      deps.suggestionsInSearchFieldsCheckbox.value &&
      searchBarVisible &&
      deps.urlbarSuggestionsEnabledPref.value
    ) {
      return true;
    }
    return false;
  },
  set: (newCheckedValue, deps, setting) => {
    if (setting.disabled) {
      deps.urlbarSuggestionsEnabledPref.value = false;
      return false;
    }

    let searchBarVisible =
      !!lazy.CustomizableUI.getPlacementOfWidget("search-container");
    if (deps.suggestionsInSearchFieldsCheckbox.value && searchBarVisible) {
      deps.urlbarSuggestionsEnabledPref.value = newCheckedValue;
    }
    return newCheckedValue;
  },
  setup: onChange => {
    // Add observer of CustomizableUI as checkbox should be hidden while
    // searchbar is enabled.
    let customizableUIListener = {
      onWidgetAfterDOMChange: node => {
        if (node.id == "search-container") {
          onChange();
        }
      },
    };
    lazy.CustomizableUI.addListener(customizableUIListener);
    return () => lazy.CustomizableUI.removeListener(customizableUIListener);
  },
  disabled: deps => {
    return (
      !deps.searchSuggestionsEnabledPref.value ||
      deps.permanentPBEnabledPref.value
    );
  },
  visible: () => {
    let searchBarVisible =
      !!lazy.CustomizableUI.getPlacementOfWidget("search-container");
    return searchBarVisible;
  },
});

Preferences.addSetting({
  id: "showSearchSuggestionsFirstCheckbox",
  pref: "browser.urlbar.showSearchSuggestionsFirst",
  deps: [
    "suggestionsInSearchFieldsCheckbox",
    "urlbarSuggestionsEnabledPref",
    "searchSuggestionsEnabledPref",
    "permanentPBEnabledPref",
  ],
  get: (newCheckedValue, deps) => {
    if (!deps.searchSuggestionsEnabledPref.value) {
      return false;
    }
    return deps.urlbarSuggestionsEnabledPref.value ? newCheckedValue : false;
  },
  disabled: deps => {
    return (
      !deps.suggestionsInSearchFieldsCheckbox.value ||
      !deps.urlbarSuggestionsEnabledPref.value ||
      deps.permanentPBEnabledPref.value
    );
  },
});

Preferences.addSetting({
  id: "showSearchSuggestionsPrivateWindowsCheckbox",
  pref: "browser.search.suggest.enabled.private",
  deps: ["searchSuggestionsEnabledPref"],
  disabled: deps => {
    return !deps.searchSuggestionsEnabledPref.value;
  },
});

Preferences.addSetting({
  id: "showTrendingSuggestionsCheckbox",
  pref: "browser.urlbar.suggest.trending",
  deps: [
    "searchSuggestionsEnabledPref",
    "permanentPBEnabledPref",
    // Required to dynamically update the disabled state when the default engine is changed.
    "defaultEngineNormal",
    "trendingFeaturegatePref",
  ],
  visible: deps => deps.trendingFeaturegatePref.value,
  disabled: deps => {
    let trendingSupported =
      lazy.SearchService.defaultEngine.supportsResponseType(
        lazy.SearchUtils.URL_TYPE.TRENDING_JSON
      );
    return (
      !deps.searchSuggestionsEnabledPref.value ||
      deps.permanentPBEnabledPref.value ||
      !trendingSupported
    );
  },
});

Preferences.addSetting({
  id: "urlBarSuggestionPermanentPBMessage",
  deps: ["urlBarSuggestionCheckbox", "permanentPBEnabledPref"],
  visible: deps => {
    return (
      deps.urlBarSuggestionCheckbox.visible && deps.permanentPBEnabledPref.value
    );
  },
});

Preferences.addSetting({
  id: "quickSuggestEnabledPref",
  pref: "browser.urlbar.quicksuggest.enabled",
});

Preferences.addSetting({
  id: "quickSuggestSettingsUiPref",
  pref: "browser.urlbar.quicksuggest.settingsUi",
});

Preferences.addSetting({
  id: "nimbusListener",
  setup(onChange) {
    NimbusFeatures.urlbar.onUpdate(onChange);
    return () => NimbusFeatures.urlbar.offUpdate(onChange);
  },
});

Preferences.addSetting({
  id: "locationBarGroupHeader",
  deps: [
    "quickSuggestEnabledPref",
    "quickSuggestSettingsUiPref",
    "nimbusListener",
  ],
  getControlConfig(config) {
    let l10nId =
      lazy.UrlbarPrefs.get("quickSuggestEnabled") &&
      lazy.UrlbarPrefs.get("quickSuggestSettingsUi") !=
        lazy.QuickSuggest.SETTINGS_UI.NONE
        ? "addressbar-header-firefox-suggest-2"
        : "addressbar-header-1";

    return { ...config, l10nId };
  },
});

Preferences.addSetting({
  id: "historySuggestion",
  pref: "browser.urlbar.suggest.history",
});

Preferences.addSetting({
  id: "bookmarkSuggestion",
  pref: "browser.urlbar.suggest.bookmark",
});

Preferences.addSetting({
  id: "clipboardFeaturegate",
  pref: "browser.urlbar.clipboard.featureGate",
});

Preferences.addSetting({
  id: "clipboardSuggestion",
  pref: "browser.urlbar.suggest.clipboard",
  deps: ["clipboardFeaturegate"],
  visible: deps => {
    return deps.clipboardFeaturegate.value;
  },
});

Preferences.addSetting({
  id: "openpageSuggestion",
  pref: "browser.urlbar.suggest.openpage",
});

Preferences.addSetting({
  id: "topSitesSuggestion",
  pref: "browser.urlbar.suggest.topsites",
});

Preferences.addSetting({
  id: "enableRecentSearchesFeatureGate",
  pref: "browser.urlbar.recentsearches.featureGate",
});

Preferences.addSetting({
  id: "enableRecentSearches",
  pref: "browser.urlbar.suggest.recentsearches",
  deps: ["enableRecentSearchesFeatureGate"],
  visible: deps => {
    return deps.enableRecentSearchesFeatureGate.value;
  },
});

Preferences.addSetting({
  id: "enginesSuggestion",
  pref: "browser.urlbar.suggest.engines",
});

Preferences.addSetting({
  id: "quickActionsShowPrefs",
  pref: "browser.urlbar.quickactions.showPrefs",
});

Preferences.addSetting({
  id: "enableQuickActions",
  pref: "browser.urlbar.suggest.quickactions",
  deps: ["quickActionsShowPrefs", "scotchBonnetEnabled"],
  visible: deps => {
    return deps.quickActionsShowPrefs.value || deps.scotchBonnetEnabled.value;
  },
});

function determineSuggestionSettingsVisibility() {
  if (!lazy.UrlbarPrefs.get("quickSuggestEnabled")) {
    return false;
  } else if (
    lazy.UrlbarPrefs.get("quickSuggestSettingsUi") ==
    lazy.QuickSuggest.SETTINGS_UI.NONE
  ) {
    return false;
  }
  return true;
}

Preferences.addSetting({
  id: "firefoxSuggestAll",
  pref: "browser.urlbar.suggest.quicksuggest.all",
  deps: [
    "quickSuggestEnabledPref",
    "quickSuggestSettingsUiPref",
    "nimbusListener",
  ],
  visible: determineSuggestionSettingsVisibility,
});

Preferences.addSetting({
  id: "firefoxSuggestSponsored",
  pref: "browser.urlbar.suggest.quicksuggest.sponsored",
  deps: [
    "firefoxSuggestAll",
    "quickSuggestEnabledPref",
    "quickSuggestSettingsUiPref",
    "nimbusListener",
  ],
  visible: determineSuggestionSettingsVisibility,
  disabled: deps => {
    return !deps.firefoxSuggestAll.value;
  },
});

Preferences.addSetting({
  id: "firefoxSuggestOnlineEnabledToggle",
  pref: "browser.urlbar.quicksuggest.online.enabled",
  deps: [
    "firefoxSuggestAll",
    "quickSuggestEnabledPref",
    "quickSuggestSettingsUiPref",
    "nimbusListener",
  ],
  visible: () => {
    if (!lazy.UrlbarPrefs.get("quickSuggestEnabled")) {
      return false;
    } else if (
      lazy.UrlbarPrefs.get("quickSuggestSettingsUi") ==
      lazy.QuickSuggest.SETTINGS_UI.NONE
    ) {
      return false;
    }
    return (
      lazy.UrlbarPrefs.get("quickSuggestSettingsUi") ==
      lazy.QuickSuggest.SETTINGS_UI.FULL
    );
  },
  disabled: deps => {
    return !deps.firefoxSuggestAll.value;
  },
});

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "restoreDismissedSuggestions";
    setup() {
      Services.obs.addObserver(
        this.emitChange,
        "quicksuggest-dismissals-changed"
      );
      return () => {
        Services.obs.removeObserver(
          this.emitChange,
          "quicksuggest-dismissals-changed"
        );
      };
    }
    async disabled() {
      return !(await lazy.QuickSuggest.canClearDismissedSuggestions());
    }
    onUserClick() {
      lazy.QuickSuggest.clearDismissedSuggestions();
    }
  }
);

Preferences.addSetting({
  id: "dismissedSuggestionsDescription",
  deps: [
    "firefoxSuggestAll",
    "quickSuggestEnabledPref",
    "quickSuggestSettingsUiPref",
    "nimbusListener",
  ],
  visible: determineSuggestionSettingsVisibility,
});

/**
 * @type {?() => void}
 *   Enables notification for an engine update from outside the setting.
 */
let searchEngineUpdateNotifier;
Preferences.addSetting(
  /** @type {{ _engineUpdateTriggered: boolean, _emitChange: Function } & SettingConfig} */ ({
    id: "updateSearchEngineSuccess",
    _engineUpdateTriggered: false,
    _emitChange: null,
    setup(emitChange) {
      this._emitChange = emitChange;
      searchEngineUpdateNotifier = () => {
        this._engineUpdateTriggered = true;
        emitChange();
      };
      return () => {
        searchEngineUpdateNotifier = null;
        this._emitChange = null;
      };
    },
    onMessageBarDismiss(e) {
      e.preventDefault();
      this._engineUpdateTriggered = false;
      this._emitChange?.();
    },
    visible() {
      return this._engineUpdateTriggered;
    },
  })
);

/**
 * Creates an AsyncSetting to handle an individual item in the search engine
 * list.
 *
 * @param {string} settingId
 * @param {SearchEngine} engine
 */
function EngineListItemSetting(settingId, engine) {
  return class extends Preferences.AsyncSetting {
    static id = settingId;

    setup() {
      /** @type {(subject: {wrappedJSObject: SearchEngine}, topic: string, data: string) => void} */
      let onTargetEngineChanged = (subject, _topic, data) => {
        if (
          (data == lazy.SearchUtils.MODIFIED_TYPE.CHANGED ||
            data == lazy.SearchUtils.MODIFIED_TYPE.ICON_CHANGED) &&
          subject.wrappedJSObject == engine
        ) {
          this.emitChange();
        }
      };

      Services.obs.addObserver(
        onTargetEngineChanged,
        lazy.SearchUtils.TOPIC_ENGINE_MODIFIED
      );
      return () =>
        Services.obs.removeObserver(
          onTargetEngineChanged,
          lazy.SearchUtils.TOPIC_ENGINE_MODIFIED
        );
    }

    async getControlConfig() {
      /** @type {Partial<SettingControlConfig>} */
      return {
        // 24 is the same size as `--icon-size-large`.
        iconSrc: await getEngineIcon(engine, 24),
        controlAttrs: {
          class: engine.hidden ? "description-deemphasized" : "",
          label: engine.name,
          description: engine.aliases.join(", "),
          layout: "medium-icon",
        },
      };
    }
  };
}

Preferences.addSetting({
  id: "addEngineButton",
  onUserClick() {
    gSubDialog.open(
      "chrome://browser/content/search/addEngine.xhtml",
      { features: "resizable=no, modal=yes" },
      { mode: "NEW" }
    );
  },
});

/**
 * @param {SettingConfig} config
 */
function maybeMakeSetting(config) {
  if (!Preferences.getSetting(config.id)) {
    Preferences.addSetting(config);
  }
}

/**
 * Creates a Setting to handle an individual toggle within the list item for
 * a search engine in the engine list.
 *
 * @param {string} toggleId
 * @param {SearchEngine} engine
 * @returns {SettingConfig}
 */
function ToggleSetting(toggleId, engine) {
  return {
    id: toggleId,
    setup(emitChange) {
      /** @type {(subject: {wrappedJSObject: SearchEngine}, topic: string, data: string) => void} */
      let onTargetEngineChanged = (subject, _topic, data) => {
        if (
          (data == lazy.SearchUtils.MODIFIED_TYPE.CHANGED ||
            data == lazy.SearchUtils.MODIFIED_TYPE.ICON_CHANGED) &&
          subject.wrappedJSObject == engine
        ) {
          emitChange();
        }
      };

      Services.obs.addObserver(
        onTargetEngineChanged,
        lazy.SearchUtils.TOPIC_ENGINE_MODIFIED
      );
      return () =>
        Services.obs.removeObserver(
          onTargetEngineChanged,
          lazy.SearchUtils.TOPIC_ENGINE_MODIFIED
        );
    },
    get() {
      return !engine.hidden;
    },
    onUserChange() {
      engine.hidden = !engine.hidden;
    },
  };
}

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "engineList";

    /**
     * @type {?Map<Values<typeof lazy.UrlbarUtils.RESULT_SOURCE>, string[]>}
     *   This maps local shortcut sources to their l10n names. The first item
     *   in the string array is the display name for the local source.
     *   All items in the string should be used for displaying as aliases.
     */
    #localShortcutL10nNames = null;

    setup() {
      Services.obs.addObserver(
        this.emitChange,
        "browser-search-engine-modified"
      );
      return () =>
        Services.obs.removeObserver(
          this.emitChange,
          "browser-search-engine-modified"
        );
    }

    /**
     * Gets and caches the l10n names for the local shortcut sources.
     */
    async getL10nNames() {
      if (this.#localShortcutL10nNames) {
        return this.#localShortcutL10nNames;
      }
      this.#localShortcutL10nNames = new Map();

      let getIDs = (suffix = "") =>
        lazy.UrlbarUtils.LOCAL_SEARCH_MODES.map(mode => {
          let name = lazy.UrlbarUtils.getResultSourceName(mode.source);
          return { id: `urlbar-search-mode-${name}${suffix}` };
        });

      try {
        let localizedIDs = getIDs();
        let englishIDs = getIDs("-en");

        let englishSearchStrings = new Localization([
          "preview/enUS-searchFeatures.ftl",
        ]);
        let localizedNames = await document.l10n.formatValues(localizedIDs);
        let englishNames = await englishSearchStrings.formatValues(englishIDs);

        lazy.UrlbarUtils.LOCAL_SEARCH_MODES.forEach(({ source }, index) => {
          let localizedName = localizedNames[index];
          let englishName = englishNames[index];

          // Add only the English name if localized and English are the same.
          let names =
            localizedName === englishName
              ? [englishName]
              : [localizedName, englishName];

          this.#localShortcutL10nNames.set(source, names);
        });
      } catch (ex) {
        console.error("Error loading l10n names", ex);
      }
      return this.#localShortcutL10nNames;
    }

    /**
     * Handles options for deleting and removing search engines.
     *
     * @param {SearchEngine} engine
     *   The engine to add settings for.
     */
    handleDeletionOptions(engine) {
      /** @type {SettingControlConfig} */
      let deletionOptions;
      if (engine.isConfigEngine) {
        let toggleId = `toggleEngine-${engine.id}`;
        maybeMakeSetting(ToggleSetting(toggleId, engine));

        deletionOptions = {
          id: toggleId,
          l10nId: "search-enable-engine",
          control: "moz-toggle",
          slot: "actions",
        };
      } else {
        let deletionId = `deleteEngine-${engine.id}`;
        maybeMakeSetting({
          id: deletionId,
          async onUserClick() {
            let [body, removeLabel] = await document.l10n.formatValues([
              "remove-engine-confirmation",
              "remove-engine-remove",
            ]);

            let button = Services.prompt.confirmExBC(
              window.browsingContext,
              Services.prompt.MODAL_TYPE_CONTENT,
              null,
              body,
              (Services.prompt.BUTTON_TITLE_IS_STRING *
                Services.prompt.BUTTON_POS_0) |
                (Services.prompt.BUTTON_TITLE_CANCEL *
                  Services.prompt.BUTTON_POS_1),
              removeLabel,
              null,
              null,
              null,
              {}
            );

            if (button == 0) {
              await lazy.SearchService.removeEngine(
                engine,
                lazy.SearchService.CHANGE_REASON.USER
              );
            }
          },
        });

        deletionOptions = {
          id: deletionId,
          l10nId: "search-delete-engine",
          control: "moz-button",
          iconSrc: "chrome://global/skin/icons/delete.svg",
          slot: "actions",
        };
      }

      return deletionOptions;
    }

    /**
     * Curates the configuration for the list of search engines for display in
     * the group box.
     */
    async makeEngineList() {
      /** @type {SettingControlConfig[]} */
      let configs = [];
      for (let engine of await lazy.SearchService.getEngines()) {
        let settingId = `engineList-${engine.id}`;
        let editId = `editEngine-${engine.id}`;
        let outlinkId = `outlink-${engine.id}`;

        maybeMakeSetting(EngineListItemSetting(settingId, engine));
        maybeMakeSetting({
          id: editId,
          disabled: () => engine.hidden,
          onUserClick() {
            gSubDialog.open(
              "chrome://browser/content/search/addEngine.xhtml",
              {
                features: "resizable=no, modal=yes",
                closingCallback: event => {
                  if (event.detail.button == "accept") {
                    searchEngineUpdateNotifier?.();
                  }
                },
              },
              { engine, mode: "EDIT" }
            );
          },
        });

        /** @type {SettingControlConfig} */
        let config = {
          id: settingId,
          control: "moz-box-item",
          items: [
            {
              id: editId,
              l10nId: "search-edit-engine-2",
              control: "moz-button",
              iconSrc: "chrome://global/skin/icons/edit-outline.svg",
              slot: "actions",
            },
          ],
        };

        // Addon search engines need an edit button to edit the alias names
        // and an outlink icon, but they should not have a toggle or a delete
        // button.
        if (!(engine instanceof lazy.AddonSearchEngine)) {
          config.items.push(this.handleDeletionOptions(engine));
        } else {
          maybeMakeSetting({
            id: outlinkId,
            onUserClick(e) {
              e.preventDefault();
              // @ts-expect-error topChromeWindow global
              window.browsingContext.topChromeWindow.BrowserAddonUI.manageAddon(
                engine.extensionID
              );
            },
          });

          config.items.push({
            id: outlinkId,
            l10nId: "search-outlink-to-extensions-page",
            control: "moz-button",
            iconSrc: "chrome://global/skin/icons/open-in-new.svg",
            slot: "actions",
          });
        }

        configs.push(config);
      }

      return configs;
    }

    /**
     * Curates the configuration for the list of search modes for display in
     * the group box.
     */
    async makeSearchModesList() {
      let l10nNames = await this.getL10nNames();

      /** @type {SettingControlConfig[]} */
      let configs = [];
      for (let searchMode of lazy.UrlbarUtils.LOCAL_SEARCH_MODES) {
        let id = `searchmode-${searchMode.telemetryLabel}`;
        maybeMakeSetting({ id });

        // Convert the localized words into lowercase keywords prepended with
        // an @ symbol.
        let keywords = l10nNames
          .get(searchMode.source)
          .map(keyword => `@${keyword.toLowerCase()}`)
          .join(", ");

        // Add the restrict token as a keyword option as well.
        keywords += `, ${searchMode.restrict}`;

        configs.push({
          id,
          control: "moz-box-item",
          slot: "static",
          iconSrc: searchMode.icon,
          controlAttrs: {
            label: l10nNames.get(searchMode.source)[0],
            description: keywords,
            layout: "medium-icon",
          },
        });
      }

      return configs;
    }

    async onUserReorder(event) {
      const { draggedElement, targetIndex } = event.detail;
      let draggedEngineName = draggedElement.label;
      let draggedEngine = lazy.SearchService.getEngineByName(draggedEngineName);
      await lazy.SearchService.moveEngine(draggedEngine, targetIndex);
    }
    async getControlConfig() {
      return {
        items: [
          ...(await this.makeEngineList()),
          ...(await this.makeSearchModesList()),
        ],
      };
    }
  }
);

const ENGINE_FLAVOR = "text/x-moz-search-engine";
const SEARCH_TYPE = "default_search";
const SEARCH_KEY = "defaultSearch";

var gEngineView = null;

var gSearchPane = {
  _engineStore: null,

  init() {
    initSettingGroup("defaultEngine");
    initSettingGroup("searchSuggestions");
    initSettingGroup("firefoxSuggest");
    initSettingGroup("searchShortcuts");
    this._engineStore = new EngineStore();
    gEngineView = new EngineView(this._engineStore);

    this._engineStore.init().catch(console.error);

    if (
      Services.policies &&
      !Services.policies.isAllowed("installSearchEngine")
    ) {
      document.getElementById("addEnginesBox").hidden = true;
    } else {
      let addEnginesLink = document.getElementById("addEngines");
      addEnginesLink.setAttribute("href", lazy.SearchUIUtils.searchEnginesURL);
    }

    window.addEventListener("command", this);

    Services.obs.addObserver(this, "browser-search-engine-modified");
    Services.obs.addObserver(this, "intl:app-locales-changed");
    window.addEventListener("unload", () => {
      Services.obs.removeObserver(this, "browser-search-engine-modified");
      Services.obs.removeObserver(this, "intl:app-locales-changed");
    });
  },

  // ADDRESS BAR
  handleEvent(aEvent) {
    if (aEvent.type != "command") {
      return;
    }
    switch (aEvent.target.id) {
      case "":
        if (aEvent.target.parentNode && aEvent.target.parentNode.parentNode) {
          if (aEvent.target.parentNode.parentNode.id == "defaultEngine") {
            gSearchPane.setDefaultEngine();
          } else if (
            aEvent.target.parentNode.parentNode.id == "defaultPrivateEngine"
          ) {
            gSearchPane.setDefaultPrivateEngine();
          }
        }
        break;
      default:
        gEngineView.handleEvent(aEvent);
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
   * nsIObserver implementation.
   */
  observe(subject, topic, data) {
    switch (topic) {
      case "intl:app-locales-changed": {
        this.appLocalesChanged();
        break;
      }
      case "browser-search-engine-modified": {
        this._engineStore.browserSearchEngineModified(
          subject.wrappedJSObject,
          data
        );
        break;
      }
    }
  },

  showRestoreDefaults(aEnable) {
    document.getElementById("restoreDefaultSearchEngines").disabled = !aEnable;
  },

  async setDefaultEngine() {
    await lazy.SearchService.setDefault(
      document.getElementById("defaultEngine").selectedItem.engine
        .originalEngine,
      lazy.SearchService.CHANGE_REASON.USER
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
    await lazy.SearchService.setDefaultPrivate(
      document.getElementById("defaultPrivateEngine").selectedItem.engine
        .originalEngine,
      lazy.SearchService.CHANGE_REASON.USER
    );
  },
};

/**
 * Keeps track of the search engine objects and notifies the views for updates.
 */
class EngineStore {
  /**
   * A list of engines that are currently visible in the UI.
   *
   * @type {object[]}
   */
  engines = [];

  /**
   * A list of listeners to be notified when the engine list changes.
   *
   * @type {object[]}
   */
  #listeners = [];

  async init() {
    let engines = await lazy.SearchService.getEngines();

    let visibleEngines = engines.filter(e => !e.hidden);
    for (let engine of visibleEngines) {
      this.addEngine(engine);
    }
    this.notifyRowCountChanged(0, visibleEngines.length);

    gSearchPane.showRestoreDefaults(
      engines.some(e => e.isAppProvided && e.hidden)
    );
  }

  /**
   * Adds a listener to be notified when the engine list changes.
   *
   * @param {object} aListener
   */
  addListener(aListener) {
    this.#listeners.push(aListener);
  }

  /**
   * Notifies all listeners that the engine list has changed and they should
   * rebuild.
   */
  notifyRebuildViews() {
    for (let listener of this.#listeners) {
      try {
        listener.rebuild(this.engines);
      } catch (ex) {
        console.error("Error notifying EngineStore listener", ex);
      }
    }
  }

  /**
   * Notifies all listeners that the number of engines in the list has changed.
   *
   * @param {number} index
   * @param {number} count
   */
  notifyRowCountChanged(index, count) {
    for (let listener of this.#listeners) {
      listener.rowCountChanged(index, count, this.engines);
    }
  }

  /**
   * Notifies all listeners that the default engine has changed.
   *
   * @param {string} type
   * @param {object} engine
   */
  notifyDefaultEngineChanged(type, engine) {
    for (let listener of this.#listeners) {
      if ("defaultEngineChanged" in listener) {
        listener.defaultEngineChanged(type, engine, this.engines);
      }
    }
  }

  notifyEngineIconUpdated(engine) {
    // Check the engine is still in the list.
    let index = this._getIndexForEngine(engine);
    if (index != -1) {
      for (let listener of this.#listeners) {
        listener.engineIconUpdated(index, this.engines);
      }
    }
  }

  _getIndexForEngine(aEngine) {
    return this.engines.indexOf(aEngine);
  }

  _getEngineByName(aName) {
    return this.engines.find(engine => engine.name == aName);
  }

  /**
   * Converts an SearchEngine object into an Engine Store
   * search engine object.
   *
   * @param {SearchEngine} aEngine
   *   The search engine to convert.
   * @returns {object}
   *   The EngineStore search engine object.
   */
  _cloneEngine(aEngine) {
    var clonedObj = {
      iconURL: null,
    };
    for (let i of ["id", "name", "alias", "hidden", "isAppProvided"]) {
      clonedObj[i] = aEngine[i];
    }
    clonedObj.isAddonEngine = aEngine instanceof lazy.AddonSearchEngine;
    clonedObj.isUserEngine = aEngine instanceof lazy.UserSearchEngine;
    clonedObj.originalEngine = aEngine;

    // Trigger getting the iconURL for this engine.
    aEngine.getIconURL().then(iconURL => {
      if (iconURL) {
        clonedObj.iconURL = iconURL;
      } else if (window.devicePixelRatio > 1) {
        clonedObj.iconURL =
          "chrome://browser/skin/search-engine-placeholder@2x.png";
      } else {
        clonedObj.iconURL =
          "chrome://browser/skin/search-engine-placeholder.png";
      }

      this.notifyEngineIconUpdated(clonedObj);
    });

    return clonedObj;
  }

  // Callback for Array's some(). A thisObj must be passed to some()
  _isSameEngine(aEngineClone) {
    return aEngineClone.originalEngine.id == this.originalEngine.id;
  }

  addEngine(aEngine) {
    this.engines.push(this._cloneEngine(aEngine));
  }

  updateEngine(newEngine) {
    let engineToUpdate = this.engines.findIndex(
      e => e.originalEngine.id == newEngine.id
    );
    if (engineToUpdate != -1) {
      this.engines[engineToUpdate] = this._cloneEngine(newEngine);
    }
  }

  moveEngine(aEngine, aNewIndex) {
    if (aNewIndex < 0 || aNewIndex > this.engines.length - 1) {
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
    var removedEngine = this.engines.splice(index, 1)[0];
    this.engines.splice(aNewIndex, 0, removedEngine);

    return lazy.SearchService.moveEngine(
      aEngine.originalEngine,
      aNewIndex,
      true
    );
  }

  /**
   * Called when a search engine is removed.
   *
   * @param {SearchEngine} aEngine
   *   The Engine being removed. Note that this is an SearchEngine object.
   */
  removeEngine(aEngine) {
    if (this.engines.length == 1) {
      throw new Error("Cannot remove last engine!");
    }

    let engineId = aEngine.id;
    let index = this.engines.findIndex(element => element.id == engineId);

    if (index == -1) {
      throw new Error("invalid engine?");
    }

    this.engines.splice(index, 1)[0];

    if (aEngine.isAppProvided) {
      gSearchPane.showRestoreDefaults(true);
    }

    this.notifyRowCountChanged(index, -1);

    document.getElementById("engineList").focus();
  }

  /**
   * Update the default engine UI and engine tree view as appropriate when engine changes
   * or locale changes occur.
   *
   * @param {SearchEngine} engine
   * @param {string} data
   */
  browserSearchEngineModified(engine, data) {
    switch (data) {
      case "engine-added":
        this.addEngine(engine);
        this.notifyRowCountChanged(gEngineView.lastEngineIndex, 1);
        break;
      case "engine-changed":
      case "engine-icon-changed":
        this.updateEngine(engine);
        this.notifyRebuildViews();
        break;
      case "engine-removed":
        this.removeEngine(engine);
        break;
      case "engine-default":
        this.notifyDefaultEngineChanged("normal", engine);
        break;
      case "engine-default-private":
        this.notifyDefaultEngineChanged("private", engine);
        break;
    }
  }

  async restoreDefaultEngines() {
    var added = 0;
    // _cloneEngine is necessary here because all functions in
    // this file work on EngineStore search engine objects.
    let appProvidedEngines = (
      await lazy.SearchService.getAppProvidedEngines()
    ).map(this._cloneEngine, this);

    for (var i = 0; i < appProvidedEngines.length; ++i) {
      var e = appProvidedEngines[i];

      // If the engine is already in the list, just move it.
      if (this.engines.some(this._isSameEngine, e)) {
        await this.moveEngine(this._getEngineByName(e.name), i);
      } else {
        // Otherwise, add it back to our internal store

        // The search service removes the alias when an engine is hidden,
        // so clear any alias we may have cached before unhiding the engine.
        e.alias = "";

        this.engines.splice(i, 0, e);
        let engine = e.originalEngine;
        engine.hidden = false;
        await lazy.SearchService.moveEngine(engine, i, true);
        added++;
      }
    }

    // We can't do this as part of the loop above because the indices are
    // used for moving engines.
    let policyRemovedEngineNames =
      Services.policies.getActivePolicies()?.SearchEngines?.Remove || [];
    for (let engineName of policyRemovedEngineNames) {
      let engine = lazy.SearchService.getEngineByName(engineName);
      if (engine) {
        try {
          await lazy.SearchService.removeEngine(
            engine,
            lazy.SearchService.CHANGE_REASON.ENTERPRISE
          );
        } catch (ex) {
          // Engine might not exist
        }
      }
    }

    lazy.SearchService.resetToAppDefaultEngine();
    gSearchPane.showRestoreDefaults(false);
    this.notifyRebuildViews();
    return added;
  }

  changeEngine(aEngine, aProp, aNewValue) {
    var index = this._getIndexForEngine(aEngine);
    if (index == -1) {
      throw new Error("invalid engine?");
    }

    this.engines[index][aProp] = aNewValue;
    aEngine.originalEngine[aProp] = aNewValue;
  }
}

/**
 * Manages the view of the Search Shortcuts tree on the search pane of preferences.
 */
class EngineView {
  _engineStore;
  _engineList = null;
  tree = null;

  /**
   * @param {EngineStore} aEngineStore
   */
  constructor(aEngineStore) {
    this._engineStore = aEngineStore;
    this._engineList = document.getElementById("engineList");
    this._engineList.view = this;

    lazy.UrlbarPrefs.addObserver(this);
    aEngineStore.addListener(this);

    this.loadL10nNames();
    this.#addListeners();
  }

  async loadL10nNames() {
    // This maps local shortcut sources to their l10n names.  The names are needed
    // by getCellText.  Getting the names is async but getCellText is not, so we
    // cache them here to retrieve them syncronously in getCellText.
    this._localShortcutL10nNames = new Map();

    let getIDs = (suffix = "") =>
      lazy.UrlbarUtils.LOCAL_SEARCH_MODES.map(mode => {
        let name = lazy.UrlbarUtils.getResultSourceName(mode.source);
        return { id: `urlbar-search-mode-${name}${suffix}` };
      });

    try {
      let localizedIDs = getIDs();
      let englishIDs = getIDs("-en");

      let englishSearchStrings = new Localization([
        "preview/enUS-searchFeatures.ftl",
      ]);
      let localizedNames = await document.l10n.formatValues(localizedIDs);
      let englishNames = await englishSearchStrings.formatValues(englishIDs);

      lazy.UrlbarUtils.LOCAL_SEARCH_MODES.forEach(({ source }, index) => {
        let localizedName = localizedNames[index];
        let englishName = englishNames[index];

        // Add only the English name if localized and English are the same
        let names =
          localizedName === englishName
            ? [englishName]
            : [localizedName, englishName];

        this._localShortcutL10nNames.set(source, names);

        // Invalidate the tree now that we have the names in case getCellText was
        // called before name retrieval finished.
        this.invalidate();
      });
    } catch (ex) {
      console.error("Error loading l10n names", ex);
    }
  }

  #addListeners() {
    this._engineList.addEventListener("click", this);
    this._engineList.addEventListener("dragstart", this);
    this._engineList.addEventListener("keypress", this);
    this._engineList.addEventListener("select", this);
    this._engineList.addEventListener("dblclick", this);
  }

  get lastEngineIndex() {
    return this._engineStore.engines.length - 1;
  }

  get selectedIndex() {
    var seln = this.selection;
    if (seln.getRangeCount() > 0) {
      var min = {};
      seln.getRangeAt(0, min, {});
      return min.value;
    }
    return -1;
  }

  get selectedEngine() {
    return this._engineStore.engines[this.selectedIndex];
  }

  // Helpers
  rebuild() {
    this.invalidate();
  }

  rowCountChanged(index, count) {
    if (!this.tree) {
      return;
    }
    this.tree.rowCountChanged(index, count);

    // If we're removing elements, ensure that we still have a selection.
    if (count < 0) {
      this.selection.select(Math.min(index, this.rowCount - 1));
      this.ensureRowIsVisible(this.currentIndex);
    }
  }

  engineIconUpdated(index) {
    this.tree?.invalidateCell(
      index,
      this.tree.columns.getNamedColumn("engineName")
    );
  }

  invalidate() {
    this.tree?.invalidate();
  }

  ensureRowIsVisible(index) {
    this.tree.ensureRowIsVisible(index);
  }

  getSourceIndexFromDrag(dataTransfer) {
    return parseInt(dataTransfer.getData(ENGINE_FLAVOR));
  }

  isCheckBox(index, column) {
    return column.id == "engineShown";
  }

  isEngineSelectedAndRemovable() {
    let defaultEngine = lazy.SearchService.defaultEngine;
    let defaultPrivateEngine = lazy.SearchService.defaultPrivateEngine;
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
  }

  /**
   * Removes a search engine from the search service.
   *
   * Application provided engines are removed without confirmation since they
   * can easily be restored. Addon engines are not removed (see comment).
   * For other engine types, the user is prompted for confirmation.
   *
   * @param {object} engine
   *   The search engine object from EngineStore to remove.
   */
  async promptAndRemoveEngine(engine) {
    if (engine.isAppProvided) {
      lazy.SearchService.removeEngine(
        this.selectedEngine.originalEngine,
        lazy.SearchService.CHANGE_REASON.USER
      );
      return;
    }

    if (engine.isAddonEngine) {
      // Addon engines will re-appear after restarting, see Bug 1546652.
      // This should ideally prompt the user if they want to remove the addon.
      let msg = await document.l10n.formatValue("remove-addon-engine-alert");
      alert(msg);
      return;
    }

    let [body, removeLabel] = await document.l10n.formatValues([
      "remove-engine-confirmation",
      "remove-engine-remove",
    ]);

    let button = Services.prompt.confirmExBC(
      window.browsingContext,
      Services.prompt.MODAL_TYPE_CONTENT,
      null,
      body,
      (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) |
        (Services.prompt.BUTTON_TITLE_CANCEL * Services.prompt.BUTTON_POS_1),
      removeLabel,
      null,
      null,
      null,
      {}
    );

    // Button 0 is the remove button.
    if (button == 0) {
      lazy.SearchService.removeEngine(
        this.selectedEngine.originalEngine,
        lazy.SearchService.CHANGE_REASON.USER
      );
    }
  }

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
    return lazy.UrlbarUtils.LOCAL_SEARCH_MODES[index - engineCount];
  }

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
  }

  handleEvent(aEvent) {
    switch (aEvent.type) {
      case "dblclick":
        if (aEvent.target.id == "engineChildren") {
          let cell = aEvent.target.parentNode.getCellAt(
            aEvent.clientX,
            aEvent.clientY
          );
          if (cell.col?.id == "engineKeyword") {
            this.#startEditingAlias(this.selectedIndex);
          }
        }
        break;
      case "click":
        if (
          aEvent.target.id != "engineChildren" &&
          !aEvent.target.classList.contains("searchEngineAction")
        ) {
          // We don't want to toggle off selection while editing keyword
          // so proceed only when the input field is hidden.
          // We need to check that engineList.view is defined here
          // because the "click" event listener is on <window> and the
          // view might have been destroyed if the pane has been navigated
          // away from.
          if (this._engineList.inputField.hidden && this._engineList.view) {
            let selection = this._engineList.view.selection;
            if (selection?.count > 0) {
              selection.toggleSelect(selection.currentIndex);
            }
            this._engineList.blur();
          }
        }
        break;
      case "command":
        switch (aEvent.target.id) {
          case "restoreDefaultSearchEngines":
            this.#onRestoreDefaults();
            break;
          case "removeEngineButton":
            if (this.isEngineSelectedAndRemovable()) {
              this.promptAndRemoveEngine(this.selectedEngine);
            }
            break;
          case "editEngineButton":
            if (this.selectedEngine.isUserEngine) {
              let engine = this.selectedEngine.originalEngine;
              gSubDialog.open(
                "chrome://browser/content/search/addEngine.xhtml",
                { features: "resizable=no, modal=yes" },
                { engine, mode: "EDIT" }
              );
            }
            break;
          case "addEngineButton":
            gSubDialog.open(
              "chrome://browser/content/search/addEngine.xhtml",
              { features: "resizable=no, modal=yes" },
              { mode: "NEW" }
            );
            break;
        }
        break;
      case "dragstart":
        if (aEvent.target.id == "engineChildren") {
          this.#onDragEngineStart(aEvent);
        }
        break;
      case "keypress":
        if (aEvent.target.id == "engineList") {
          this.#onTreeKeyPress(aEvent);
        }
        break;
      case "select":
        if (aEvent.target.id == "engineList") {
          this.#onTreeSelect();
        }
        break;
    }
  }

  /**
   * Called when the restore default engines button is clicked to reset the
   * list of engines to their defaults.
   */
  async #onRestoreDefaults() {
    let num = await this._engineStore.restoreDefaultEngines();
    this.rowCountChanged(0, num);
  }

  #onDragEngineStart(event) {
    let selectedIndex = this.selectedIndex;

    // Local shortcut rows can't be dragged or re-ordered.
    if (this._getLocalShortcut(selectedIndex)) {
      event.preventDefault();
      return;
    }

    let tree = document.getElementById("engineList");
    let cell = tree.getCellAt(event.clientX, event.clientY);
    if (selectedIndex >= 0 && !this.isCheckBox(cell.row, cell.col)) {
      event.dataTransfer.setData(ENGINE_FLAVOR, selectedIndex.toString());
      event.dataTransfer.effectAllowed = "move";
    }
  }

  #onTreeSelect() {
    document.getElementById("removeEngineButton").disabled =
      !this.isEngineSelectedAndRemovable();
    document.getElementById("editEngineButton").disabled =
      !this.selectedEngine?.isUserEngine;
  }

  #onTreeKeyPress(aEvent) {
    let index = this.selectedIndex;
    let tree = document.getElementById("engineList");
    if (tree.hasAttribute("editing")) {
      return;
    }

    if (aEvent.charCode == KeyEvent.DOM_VK_SPACE) {
      // Space toggles the checkbox.
      let newValue = !this.getCellValue(
        index,
        tree.columns.getNamedColumn("engineShown")
      );
      this.setCellValue(
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
        this.#startEditingAlias(index);
      } else if (
        aEvent.keyCode == KeyEvent.DOM_VK_DELETE ||
        (isMac &&
          aEvent.shiftKey &&
          aEvent.keyCode == KeyEvent.DOM_VK_BACK_SPACE)
      ) {
        // Delete and Shift+Backspace (Mac) removes selected engine.
        if (this.isEngineSelectedAndRemovable()) {
          this.promptAndRemoveEngine(this.selectedEngine);
        }
      }
    }
  }

  /**
   * Triggers editing of an alias in the tree.
   *
   * @param {number} index
   */
  #startEditingAlias(index) {
    // Local shortcut aliases can't be edited.
    if (this._getLocalShortcut(index)) {
      return;
    }

    let engine = this._engineStore.engines[index];
    this.tree.startEditing(index, this.tree.columns.getLastColumn());
    this.tree.inputField.value = engine.alias || "";
    this.tree.inputField.select();
  }

  /**
   * Triggers editing of an engine name in the tree.
   *
   * @param {number} index
   */
  #startEditingName(index) {
    let engine = this._engineStore.engines[index];
    if (!engine.isUserEngine) {
      return;
    }

    this.tree.startEditing(
      index,
      this.tree.columns.getNamedColumn("engineName")
    );
    this.tree.inputField.value = engine.name;
    this.tree.inputField.select();
  }

  // nsITreeView
  get rowCount() {
    let localModes = lazy.UrlbarUtils.LOCAL_SEARCH_MODES;
    if (!lazy.UrlbarPrefs.get("scotchBonnet.enableOverride")) {
      localModes = localModes.filter(
        mode => mode.source != lazy.UrlbarUtils.RESULT_SOURCE.ACTIONS
      );
    }
    return this._engineStore.engines.length + localModes.length;
  }

  getImageSrc(index, column) {
    if (column.id == "engineName") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return shortcut.icon;
      }

      return this._engineStore.engines[index].iconURL;
    }

    return "";
  }

  getCellText(index, column) {
    if (column.id == "engineName") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return this._localShortcutL10nNames.get(shortcut.source)[0] || "";
      }
      return this._engineStore.engines[index].name;
    } else if (column.id == "engineKeyword") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        if (
          lazy.UrlbarPrefs.getScotchBonnetPref(
            "searchRestrictKeywords.featureGate"
          )
        ) {
          let keywords = this._localShortcutL10nNames
            .get(shortcut.source)
            .map(keyword => `@${keyword.toLowerCase()}`)
            .join(", ");

          return `${keywords}, ${shortcut.restrict}`;
        }

        return shortcut.restrict;
      }
      return this._engineStore.engines[index].originalEngine.aliases.join(", ");
    }
    return "";
  }

  setTree(tree) {
    this.tree = tree;
  }

  canDrop(targetIndex, orientation, dataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(dataTransfer);
    return (
      sourceIndex != -1 &&
      sourceIndex != targetIndex &&
      sourceIndex != targetIndex + orientation &&
      // Local shortcut rows can't be dragged or dropped on.
      targetIndex < this._engineStore.engines.length
    );
  }

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

    // Redraw, and adjust selection
    this.invalidate();
    this.selection.select(dropIndex);
  }

  selection = null;
  getRowProperties() {
    return "";
  }
  getCellProperties(index, column) {
    if (column.id == "engineName") {
      // For local shortcut rows, return the result source name so we can style
      // the icons in CSS.
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return lazy.UrlbarUtils.getResultSourceName(shortcut.source);
      }
    }
    return "";
  }
  getColumnProperties() {
    return "";
  }
  isContainer() {
    return false;
  }
  isContainerOpen() {
    return false;
  }
  isContainerEmpty() {
    return false;
  }
  isSeparator() {
    return false;
  }
  isSorted() {
    return false;
  }
  getParentIndex() {
    return -1;
  }
  hasNextSibling() {
    return false;
  }
  getLevel() {
    return 0;
  }
  getCellValue(index, column) {
    if (column.id == "engineShown") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        return lazy.UrlbarPrefs.get(shortcut.pref);
      }
      return !this._engineStore.engines[index].originalEngine.hideOneOffButton;
    }
    return undefined;
  }
  toggleOpenState() {}
  cycleHeader() {}
  selectionChanged() {}
  cycleCell() {}
  isEditable(index, column) {
    return (
      column.id == "engineShown" ||
      (column.id == "engineKeyword" && !this._getLocalShortcut(index)) ||
      (column.id == "engineName" &&
        this._engineStore.engines[index].isUserEngine)
    );
  }
  setCellValue(index, column, value) {
    if (column.id == "engineShown") {
      let shortcut = this._getLocalShortcut(index);
      if (shortcut) {
        lazy.UrlbarPrefs.set(shortcut.pref, value == "true");
        this.invalidate();
        return;
      }
      this._engineStore.engines[index].originalEngine.hideOneOffButton =
        value != "true";
      this.invalidate();
    }
  }
  async setCellText(index, column, value) {
    let engine = this._engineStore.engines[index];
    if (column.id == "engineKeyword") {
      let valid = await this.#changeKeyword(engine, value);
      if (!valid) {
        this.#startEditingAlias(index);
      }
    } else if (column.id == "engineName" && engine.isUserEngine) {
      let valid = await this.#changeName(engine, value);
      if (!valid) {
        this.#startEditingName(index);
      }
    }
  }

  /**
   * Handles changing the keyword for an engine. This will check for potentially
   * duplicate keywords and prompt the user if necessary.
   *
   * @param {object} aEngine
   *   The engine to change.
   * @param {string} aNewKeyword
   *   The new keyword.
   * @returns {Promise<boolean>}
   *   Resolves to true if the keyword was changed.
   */
  async #changeKeyword(aEngine, aNewKeyword) {
    let keyword = aNewKeyword.trim();
    if (keyword) {
      let isBookmarkDuplicate =
        !!(await lazy.PlacesUtils.keywords.fetch(keyword));

      let dupEngine = await lazy.SearchService.getEngineByAlias(keyword);
      let isEngineDuplicate = dupEngine !== null && dupEngine.id != aEngine.id;

      // Notify the user if they have chosen an existing engine/bookmark keyword
      if (isEngineDuplicate || isBookmarkDuplicate) {
        let msgid;
        if (isEngineDuplicate) {
          msgid = {
            id: "search-keyword-warning-engine",
            args: { name: dupEngine.name },
          };
        } else {
          msgid = { id: "search-keyword-warning-bookmark" };
        }

        let msg = await document.l10n.formatValue(msgid.id, msgid.args);
        alert(msg);
        return false;
      }
    }

    this._engineStore.changeEngine(aEngine, "alias", keyword);
    this.invalidate();
    return true;
  }

  /**
   * Handles changing the name for a user engine. This will check for
   * duplicate names and warn the user if necessary.
   *
   * @param {object} aEngine
   *   The user search engine to change.
   * @param {string} aNewName
   *   The new name.
   * @returns {Promise<boolean>}
   *   Resolves to true if the name was changed.
   */
  async #changeName(aEngine, aNewName) {
    let valid = aEngine.originalEngine.rename(aNewName);
    if (!valid) {
      let msg = await document.l10n.formatValue(
        "edit-engine-name-warning-duplicate",
        { name: aNewName }
      );
      alert(msg);
      return false;
    }
    return true;
  }
}
