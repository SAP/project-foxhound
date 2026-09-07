/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

"use strict";

/* import-globals-from main.js */

/**
 * @import {
 *  TranslationsSettingsElements,
 *  SupportedLanguages,
 *  LanguageInfo
 * } from "./translations"
 */

/** @type {string} */
const ALWAYS_TRANSLATE_LANGS_PREF =
  "browser.translations.alwaysTranslateLanguages";
/** @type {string} */
const NEVER_TRANSLATE_LANGS_PREF =
  "browser.translations.neverTranslateLanguages";
/** @type {string} */
const TOPIC_TRANSLATIONS_PREF_CHANGED = "translations:pref-changed";
/** @type {string} */
const TRANSLATIONS_PERMISSION = "translations";

/** @type {string} */
const ALWAYS_TRANSLATE_LANGUAGE_ITEM_CLASS =
  "translations-always-translate-language-item";
/** @type {string} */
const ALWAYS_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS =
  "translations-always-translate-remove-button";

/** @type {string} */
const NEVER_TRANSLATE_LANGUAGE_ITEM_CLASS =
  "translations-never-translate-language-item";
/** @type {string} */
const NEVER_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS =
  "translations-never-translate-remove-button";
/** @type {string} */
const NEVER_TRANSLATE_SITE_ITEM_CLASS =
  "translations-never-translate-site-item";
/** @type {string} */
const NEVER_TRANSLATE_SITE_REMOVE_BUTTON_CLASS =
  "translations-never-translate-site-remove-button";

/** @type {string} */
const DOWNLOAD_LANGUAGE_ITEM_CLASS = "translations-download-language-item";
/** @type {string} */
const DOWNLOAD_LANGUAGE_REMOVE_BUTTON_CLASS =
  "translations-download-remove-button";
/** @type {string} */
const DOWNLOAD_LANGUAGE_RETRY_BUTTON_CLASS =
  "translations-download-retry-button";
/** @type {string} */
const DOWNLOAD_LANGUAGE_FAILED_CLASS = "translations-download-language-error";
/** @type {string} */
const DOWNLOAD_LANGUAGE_DELETE_CONFIRM_BUTTON_CLASS =
  "translations-download-delete-confirm-button";
/** @type {string} */
const DOWNLOAD_LANGUAGE_DELETE_CANCEL_BUTTON_CLASS =
  "translations-download-delete-cancel-button";
/** @type {string} */
const DOWNLOAD_LOADING_ICON = "chrome://global/skin/icons/loading.svg";
/** @type {string} */
const DOWNLOAD_DELETE_ICON = "chrome://global/skin/icons/delete.svg";
/** @type {string} */
const DOWNLOAD_ERROR_ICON = "chrome://global/skin/icons/error.svg";
/** @type {string} */
const DOWNLOAD_WARNING_ICON = "chrome://global/skin/icons/warning.svg";

/**
 * Dispatches a test-only event when running under automation.
 *
 * @param {string} name - Event name without the "TranslationsSettingsTest:" prefix.
 * @param {object} [detail] - Optional event detail.
 */
function dispatchTestEvent(name, detail) {
  if (!globalThis.Cu?.isInAutomation) {
    return;
  }
  const options = detail ? { detail } : undefined;
  document.dispatchEvent(
    new CustomEvent(`TranslationsSettingsTest:${name}`, options)
  );
}

const TranslationsSettings = {
  /**
   * True once initialization has completed.
   *
   * @type {boolean}
   */
  initialized: false,

  /**
   * Promise guarding full initialization to avoid re-entry.
   *
   * @type {Promise<void>|null}
   */
  initPromise: null,

  /**
   * Promise cached after the pane/group finish rendering.
   *
   * @type {Promise<void>|null}
   */
  paneRenderPromise: null,

  /**
   * Supported languages fetched from TranslationsParent.
   *
   * @type {SupportedLanguages|null}
   */
  supportedLanguages: null,

  /**
   * Display names for supported languages.
   *
   * @type {Intl.DisplayNames|null}
   */
  languageDisplayNames: null,

  /**
   * Language metadata used to build labels and selectors.
   *
   * @type {LanguageInfo[]|null}
   */
  languageList: null,

  /**
   * Download sizes keyed by language tag.
   *
   * @type {Map<string, number>|null}
   */
  languageSizes: null,

  /**
   * Formatter used for download size labels.
   *
   * @type {Intl.NumberFormat|null}
   */
  numberFormatter: null,

  /**
   * Current always-translate language tags.
   *
   * @type {Set<string>}
   */
  alwaysTranslateLanguageTags: new Set(),

  /**
   * Current never-translate language tags.
   *
   * @type {Set<string>}
   */
  neverTranslateLanguageTags: new Set(),

  /**
   * Current never-translate site origins.
   *
   * @type {Set<string>}
   */
  neverTranslateSiteOrigins: new Set(),

  /**
   * Language tags with downloaded translation models.
   *
   * @type {Set<string>}
   */
  downloadedLanguageTags: new Set(),

  /**
   * Language tags currently downloading.
   *
   * @type {Set<string>}
   */
  downloadingLanguageTags: new Set(),

  /**
   * Language tags that failed to download.
   *
   * @type {Set<string>}
   */
  downloadFailedLanguageTags: new Set(),

  /**
   * Language tags pending delete confirmation.
   *
   * @type {Set<string>}
   */
  downloadPendingDeleteLanguageTags: new Set(),

  /**
   * Language tag of the in-progress download, if any.
   *
   * @type {string|null}
   */
  currentDownloadLangTag: null,

  /**
   * Cached DOM elements used by the module.
   *
   * @type {TranslationsSettingsElements|null}
   */
  elements: null,

  /**
   * Handles events this object is registered for.
   *
   * @param {Event} event
   */
  async handleEvent(event) {
    switch (event.type) {
      case "paneshown":
        await this.handlePaneShown(
          /** @type {CustomEvent} */ (event).detail?.category
        );
        break;
      case "change":
        if (event.target === this.elements?.alwaysTranslateLanguagesSelect) {
          this.onAlwaysTranslateLanguageSelectionChanged();
        } else if (
          event.target === this.elements?.neverTranslateLanguagesSelect
        ) {
          this.onNeverTranslateLanguageSelectionChanged();
        } else if (event.target === this.elements?.downloadLanguagesSelect) {
          this.onDownloadSelectionChanged();
        }
        break;
      case "click": {
        const target = /** @type {HTMLElement} */ (event.target);
        if (
          target === this.elements?.alwaysTranslateLanguagesButton ||
          target.closest?.("#translationsAlwaysTranslateLanguagesButton")
        ) {
          await this.onAlwaysTranslateLanguageChosen(
            this.elements?.alwaysTranslateLanguagesSelect?.value ?? ""
          );
          break;
        }
        if (
          target === this.elements?.neverTranslateLanguagesButton ||
          target.closest?.("#translationsNeverTranslateLanguagesButton")
        ) {
          await this.onNeverTranslateLanguageChosen(
            this.elements?.neverTranslateLanguagesSelect?.value ?? ""
          );
          break;
        }

        if (
          target === this.elements?.downloadLanguagesButton ||
          target.closest?.("#translationsDownloadLanguagesButton")
        ) {
          this.onDownloadLanguageButtonClicked();
          break;
        }

        const downloadRemoveButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${DOWNLOAD_LANGUAGE_REMOVE_BUTTON_CLASS}`)
        );
        if (downloadRemoveButton?.dataset.langTag) {
          this.onDeleteButtonClicked(downloadRemoveButton.dataset.langTag);
          break;
        }

        const downloadDeleteConfirmButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${DOWNLOAD_LANGUAGE_DELETE_CONFIRM_BUTTON_CLASS}`)
        );
        if (downloadDeleteConfirmButton?.dataset.langTag) {
          this.confirmDeleteLanguage(
            downloadDeleteConfirmButton.dataset.langTag
          );
          break;
        }

        const downloadDeleteCancelButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${DOWNLOAD_LANGUAGE_DELETE_CANCEL_BUTTON_CLASS}`)
        );
        if (downloadDeleteCancelButton?.dataset.langTag) {
          this.cancelDeleteLanguage(downloadDeleteCancelButton.dataset.langTag);
          break;
        }

        const downloadRetryButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${DOWNLOAD_LANGUAGE_RETRY_BUTTON_CLASS}`)
        );
        if (downloadRetryButton?.dataset.langTag) {
          this.retryDownloadLanguage(downloadRetryButton.dataset.langTag);
          break;
        }

        const alwaysRemoveButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${ALWAYS_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS}`)
        );
        if (alwaysRemoveButton?.dataset.langTag) {
          this.removeAlwaysTranslateLanguage(
            alwaysRemoveButton.dataset.langTag
          );
          break;
        }

        const neverRemoveButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${NEVER_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS}`)
        );
        if (neverRemoveButton?.dataset.langTag) {
          this.removeNeverTranslateLanguage(neverRemoveButton.dataset.langTag);
          break;
        }

        const neverSiteRemoveButton = /** @type {HTMLElement|null} */ (
          target.closest?.(`.${NEVER_TRANSLATE_SITE_REMOVE_BUTTON_CLASS}`)
        );
        if (neverSiteRemoveButton?.dataset.origin) {
          this.removeNeverTranslateSite(neverSiteRemoveButton.dataset.origin);
        }
        break;
      }
      case "unload":
        this.teardown();
        break;
    }
  },

  /**
   * Observer for translations pref changes.
   *
   * @param {any} subject
   * @param {string} topic
   * @param {string} data
   */
  observe(subject, topic, data) {
    if (topic === TOPIC_TRANSLATIONS_PREF_CHANGED) {
      if (data === ALWAYS_TRANSLATE_LANGS_PREF) {
        this.refreshAlwaysTranslateLanguages().catch(console.error);
      } else if (data === NEVER_TRANSLATE_LANGS_PREF) {
        this.refreshNeverTranslateLanguages().catch(console.error);
      }
    } else if (topic === "perm-changed") {
      this.handlePermissionChange(subject, data);
    }
  },

  /**
   * Runs when the translations sub-pane is shown.
   *
   * @param {string} category
   * @returns {Promise<void>}
   */
  async handlePaneShown(category) {
    if (category !== "paneTranslations") {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      await this.refreshAlwaysTranslateLanguages();
      await this.refreshNeverTranslateLanguages();
      this.refreshNeverTranslateSites();
      await this.refreshDownloadedLanguages();
      this.dispatchInitializedTestEvent();
      return;
    }

    if (this.initialized) {
      await this.refreshAlwaysTranslateLanguages();
      await this.refreshNeverTranslateLanguages();
      this.refreshNeverTranslateSites();
      await this.refreshDownloadedLanguages();
      this.dispatchInitializedTestEvent();
      return;
    }

    this.initPromise = this.init();
    await this.initPromise;
    this.initPromise = null;
  },

  /**
   * Ensure the translations pane has finished rendering.
   *
   * @returns {Promise<void>}
   */
  async ensurePaneRendered() {
    if (this.paneRenderPromise) {
      await this.paneRenderPromise;
      return;
    }

    /**
     * @typedef {HTMLElement & { getUpdateComplete?: () => Promise<void> }} ElementWithUpdateComplete
     */
    const pane = /** @type {ElementWithUpdateComplete|null} */ (
      document.querySelector('setting-pane[data-category="paneTranslations"]')
    );
    const groups = Array.from(
      document.querySelectorAll(
        'setting-group[groupid="translationsAutomaticTranslation"], setting-group[groupid="translationsDownloadLanguages"]'
      )
    );

    const promises = [];
    if (pane?.getUpdateComplete) {
      promises.push(pane.getUpdateComplete());
    }
    for (const group of groups) {
      if (group?.getUpdateComplete) {
        promises.push(group.getUpdateComplete());
      }
    }

    if (promises.length) {
      this.paneRenderPromise = (async () => {
        const results = await Promise.allSettled(promises);
        const failure = results.find(result => result.status === "rejected");
        if (failure && failure.reason) {
          console.warn("Translations pane render wait failed", failure.reason);
        }
      })();
      await this.paneRenderPromise;
    }
  },

  /**
   * Initialize the translations settings UI.
   *
   * @returns {Promise<void>}
   */
  async init() {
    await this.ensurePaneRendered();
    this.cacheElements();
    if (
      !this.elements?.alwaysTranslateLanguagesGroup ||
      !this.elements?.alwaysTranslateLanguagesSelect ||
      !this.elements?.alwaysTranslateLanguagesButton ||
      !this.elements?.alwaysTranslateLanguagesNoneRow ||
      !this.elements?.neverTranslateLanguagesGroup ||
      !this.elements?.neverTranslateLanguagesSelect ||
      !this.elements?.neverTranslateLanguagesButton ||
      !this.elements?.neverTranslateLanguagesNoneRow ||
      !this.elements?.neverTranslateSitesGroup ||
      !this.elements?.downloadLanguagesGroup ||
      !this.elements?.downloadLanguagesSelect ||
      !this.elements?.downloadLanguagesButton ||
      !this.elements?.downloadLanguagesNoneRow
    ) {
      this.dispatchInitializedTestEvent();
      return;
    }

    try {
      this.numberFormatter = null;
      this.languageDisplayNames =
        TranslationsParent.createLanguageDisplayNames();
      this.supportedLanguages =
        await TranslationsParent.getSupportedLanguages();
      this.languageList = TranslationsParent.getLanguageList(
        this.supportedLanguages
      );
      await this.loadLanguageSizes();
      await this.refreshDownloadedLanguages();
    } catch (error) {
      console.error("Failed to initialize translations settings UI", error);
      this.elements.alwaysTranslateLanguagesSelect.disabled = true;
      this.elements.alwaysTranslateLanguagesButton.disabled = true;
      this.elements.neverTranslateLanguagesSelect.disabled = true;
      this.elements.neverTranslateLanguagesButton.disabled = true;
      this.elements.downloadLanguagesSelect.disabled = true;
      this.setDownloadLanguageButtonDisabledState(true);
      this.dispatchInitializedTestEvent();
      return;
    }

    this.elements.alwaysTranslateLanguagesSelect.disabled = false;
    this.elements.alwaysTranslateLanguagesButton.disabled = true;
    this.elements.neverTranslateLanguagesSelect.disabled = false;
    this.elements.neverTranslateLanguagesButton.disabled = true;
    this.elements.downloadLanguagesSelect.disabled = false;
    this.resetDownloadSelect();
    this.setDownloadLanguageButtonDisabledState(true);
    await this.buildAlwaysTranslateSelectOptions();
    await this.buildNeverTranslateSelectOptions();
    await this.buildDownloadSelectOptions();
    await this.renderDownloadLanguages();

    this.elements.alwaysTranslateLanguagesSelect.addEventListener(
      "change",
      this
    );
    this.elements.alwaysTranslateLanguagesButton.addEventListener(
      "click",
      this
    );
    this.elements.alwaysTranslateLanguagesGroup.addEventListener("click", this);
    this.elements.neverTranslateLanguagesSelect.addEventListener(
      "change",
      this
    );
    this.elements.neverTranslateLanguagesButton.addEventListener("click", this);
    this.elements.neverTranslateLanguagesGroup.addEventListener("click", this);
    this.elements.neverTranslateSitesGroup.addEventListener("click", this);
    this.elements.downloadLanguagesSelect.addEventListener("change", this);
    this.elements.downloadLanguagesGroup.addEventListener("click", this);
    this.elements.downloadLanguagesButton.addEventListener("click", this);
    Services.obs.addObserver(this, TOPIC_TRANSLATIONS_PREF_CHANGED);
    Services.obs.addObserver(this, "perm-changed");
    window.addEventListener("unload", this);

    await this.refreshAlwaysTranslateLanguages();
    await this.refreshNeverTranslateLanguages();
    this.refreshNeverTranslateSites();
    this.initialized = true;

    this.dispatchInitializedTestEvent();
  },

  /**
   * Dispatch the test-only Initialized event and mark the document as ready.
   */
  dispatchInitializedTestEvent() {
    dispatchTestEvent("Initialized");
  },

  /**
   * Cache the DOM elements we interact with.
   */
  cacheElements() {
    if (this.elements) {
      return;
    }

    const elements = {
      alwaysTranslateLanguagesGroup: /** @type {HTMLElement} */ (
        document.getElementById("translationsAlwaysTranslateLanguagesGroup")
      ),
      alwaysTranslateLanguagesSelect: /** @type {HTMLSelectElement} */ (
        document.getElementById("translationsAlwaysTranslateLanguagesSelect")
      ),
      alwaysTranslateLanguagesButton: /** @type {HTMLButtonElement} */ (
        document.getElementById("translationsAlwaysTranslateLanguagesButton")
      ),
      alwaysTranslateLanguagesNoneRow: /** @type {HTMLElement} */ (
        document.getElementById("translationsAlwaysTranslateLanguagesNoneRow")
      ),
      neverTranslateLanguagesGroup: /** @type {HTMLElement} */ (
        document.getElementById("translationsNeverTranslateLanguagesGroup")
      ),
      neverTranslateLanguagesSelect: /** @type {HTMLSelectElement} */ (
        document.getElementById("translationsNeverTranslateLanguagesSelect")
      ),
      neverTranslateLanguagesButton: /** @type {HTMLButtonElement} */ (
        document.getElementById("translationsNeverTranslateLanguagesButton")
      ),
      neverTranslateLanguagesNoneRow: /** @type {HTMLElement} */ (
        document.getElementById("translationsNeverTranslateLanguagesNoneRow")
      ),
      neverTranslateSitesGroup: /** @type {HTMLElement} */ (
        document.getElementById("translationsNeverTranslateSitesGroup")
      ),
      neverTranslateSitesRow: /** @type {HTMLElement} */ (
        document.getElementById("translationsNeverTranslateSitesRow")
      ),
      neverTranslateSitesNoneRow: /** @type {HTMLElement} */ (
        document.getElementById("translationsNeverTranslateSitesNoneRow")
      ),
      downloadLanguagesGroup: /** @type {HTMLElement} */ (
        document.getElementById("translationsDownloadLanguagesGroup")
      ),
      downloadLanguagesSelect: /** @type {HTMLSelectElement} */ (
        document.getElementById("translationsDownloadLanguagesSelect")
      ),
      downloadLanguagesButton: /** @type {HTMLButtonElement} */ (
        document.getElementById("translationsDownloadLanguagesButton")
      ),
      downloadLanguagesNoneRow: /** @type {HTMLElement} */ (
        document.getElementById("translationsDownloadLanguagesNoneRow")
      ),
    };

    if (
      !elements.alwaysTranslateLanguagesGroup ||
      !elements.alwaysTranslateLanguagesSelect ||
      !elements.alwaysTranslateLanguagesNoneRow ||
      !elements.neverTranslateLanguagesGroup ||
      !elements.neverTranslateLanguagesSelect ||
      !elements.neverTranslateLanguagesNoneRow
    ) {
      return;
    }

    this.elements = elements;
  },

  /**
   * Load the download sizes for all supported languages and cache them.
   *
   * @returns {Promise<void>}
   */
  async loadLanguageSizes() {
    if (!this.languageList?.length) {
      this.languageSizes = new Map();
      return;
    }

    const sizes = await Promise.all(
      this.languageList.map(async (/** @type {LanguageInfo} */ { langTag }) => {
        try {
          return /** @type {[string, number]} */ ([
            langTag,
            await TranslationsParent.getLanguageSize(langTag),
          ]);
        } catch (error) {
          console.error(`Failed to get size for ${langTag}`, error);
          return /** @type {[string, number]} */ ([langTag, 0]);
        }
      })
    );

    this.languageSizes = new Map(sizes);
  },

  /**
   * Format a download size for display.
   *
   * @param {string} langTag
   * @returns {string|null}
   */
  formatLanguageSize(langTag) {
    const sizeBytes = this.languageSizes?.get(langTag);
    if (!sizeBytes && sizeBytes !== 0) {
      return null;
    }

    const sizeInMB = sizeBytes / (1024 * 1024);
    if (!Number.isFinite(sizeInMB)) {
      return null;
    }

    return this.getNumberFormatter().format(sizeInMB);
  },

  /**
   * Lazily create and return a number formatter for the app locale.
   *
   * @returns {Intl.NumberFormat}
   */
  getNumberFormatter() {
    if (this.numberFormatter) {
      return this.numberFormatter;
    }
    this.numberFormatter = new Intl.NumberFormat(
      Services.locale.appLocaleAsBCP47,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }
    );
    return this.numberFormatter;
  },

  /**
   * Build the display label for a download language including its size.
   *
   * @param {string} langTag
   * @returns {Promise<string|null>}
   */
  async formatDownloadLabel(langTag) {
    const languageLabel = this.formatLanguageLabel(langTag) ?? langTag;
    const sizeLabel = this.formatLanguageSize(langTag);
    if (!sizeLabel) {
      return languageLabel;
    }
    try {
      return await document.l10n.formatValue(
        "settings-translations-subpage-download-language-option",
        { language: languageLabel, size: sizeLabel }
      );
    } catch (error) {
      console.error("Failed to format download language label", error);
      return `${languageLabel} (${sizeLabel})`;
    }
  },

  /**
   * Populate the select options for download languages with sizes.
   *
   * @returns {Promise<void>}
   */
  async buildDownloadSelectOptions() {
    const select = this.elements?.downloadLanguagesSelect;
    if (!select || !this.supportedLanguages?.sourceLanguages?.length) {
      return;
    }

    const placeholder = select.querySelector('moz-option[value=""]');
    for (const option of select.querySelectorAll("moz-option")) {
      if (option !== placeholder) {
        option.remove();
      }
    }

    const sourceLanguages = [...this.supportedLanguages.sourceLanguages]
      .filter(({ langTag }) => langTag !== "en")
      .sort((lhs, rhs) =>
        (
          this.formatLanguageLabel(lhs.langTag) ?? lhs.displayName
        ).localeCompare(
          this.formatLanguageLabel(rhs.langTag) ?? rhs.displayName
        )
      );
    for (const { langTag, displayName } of sourceLanguages) {
      const option = document.createElement("moz-option");
      option.setAttribute("value", langTag);
      const label =
        (await this.formatDownloadLabel(langTag)) ??
        this.formatLanguageLabel(langTag) ??
        displayName;
      option.setAttribute("label", label);
      const sizeLabel = this.formatLanguageSize(langTag) ?? "";
      if (sizeLabel) {
        document.l10n.setAttributes(
          option,
          "settings-translations-subpage-download-language-option",
          {
            language: this.formatLanguageLabel(langTag) ?? displayName,
            size: sizeLabel,
          }
        );
      }
      select.appendChild(option);
    }

    this.updateDownloadSelectOptionState();
    this.resetDownloadSelect();
  },

  /**
   * Disable already-downloaded or downloading languages in the download select.
   */
  updateDownloadSelectOptionState({ preserveSelection = false } = {}) {
    const select = this.elements?.downloadLanguagesSelect;
    if (!select) {
      return;
    }

    for (const option of select.querySelectorAll("moz-option")) {
      const value = option.getAttribute("value");
      if (!value) {
        continue;
      }
      const isDisabled =
        this.downloadedLanguageTags.has(value) ||
        this.downloadingLanguageTags.has(value);
      option.toggleAttribute("disabled", isDisabled);
    }

    if (preserveSelection) {
      this.updateDownloadLanguageButtonDisabled();
    } else {
      this.resetDownloadSelect();
    }
    dispatchTestEvent("DownloadedLanguagesSelectOptionsUpdated");
  },

  /**
   * Handle a selection in the "Always translate languages" dropdown.
   *
   * @param {string} langTag
   */
  async onAlwaysTranslateLanguageChosen(langTag) {
    if (!langTag) {
      this.updateAlwaysTranslateAddButtonDisabledState();
      return;
    }

    if (this.shouldDisableAlwaysTranslateAddButton()) {
      this.updateAlwaysTranslateAddButtonDisabledState();
      return;
    }

    TranslationsParent.addLangTagToPref(langTag, ALWAYS_TRANSLATE_LANGS_PREF);
    TranslationsParent.removeLangTagFromPref(
      langTag,
      NEVER_TRANSLATE_LANGS_PREF
    );
    await this.resetAlwaysTranslateSelect();
  },

  /**
   * Handle a selection change in the always-translate dropdown.
   */
  onAlwaysTranslateLanguageSelectionChanged() {
    this.updateAlwaysTranslateAddButtonDisabledState();
  },

  /**
   * Whether the add button for always-translate languages should be disabled.
   *
   * @returns {boolean}
   */
  shouldDisableAlwaysTranslateAddButton() {
    const select = this.elements?.alwaysTranslateLanguagesSelect;
    if (!select || select.disabled) {
      return true;
    }

    const langTag = select.value;
    if (!langTag) {
      return true;
    }

    const option = /** @type {HTMLElement|null} */ (
      select.querySelector(`moz-option[value="${langTag}"]`)
    );
    return option?.hasAttribute("disabled") ?? false;
  },

  /**
   * Set the add button enabled state for always-translate languages.
   *
   * @param {boolean} isDisabled
   */
  setAlwaysTranslateAddButtonDisabledState(isDisabled) {
    if (!this.elements?.alwaysTranslateLanguagesButton) {
      return;
    }

    const wasDisabled = this.elements.alwaysTranslateLanguagesButton.disabled;
    this.elements.alwaysTranslateLanguagesButton.disabled = isDisabled;
    if (wasDisabled !== isDisabled) {
      dispatchTestEvent(
        isDisabled
          ? "AlwaysTranslateLanguagesAddButtonDisabled"
          : "AlwaysTranslateLanguagesAddButtonEnabled"
      );
    }
  },

  /**
   * Update the add button enabled state for always-translate languages.
   */
  updateAlwaysTranslateAddButtonDisabledState() {
    this.setAlwaysTranslateAddButtonDisabledState(
      this.shouldDisableAlwaysTranslateAddButton()
    );
  },

  /**
   * Remove the given language from the always translate list.
   *
   * @param {string} langTag
   */
  removeAlwaysTranslateLanguage(langTag) {
    TranslationsParent.removeLangTagFromPref(
      langTag,
      ALWAYS_TRANSLATE_LANGS_PREF
    );
  },

  async resetSelect(select, settingId) {
    const setting = Preferences.getSetting?.(settingId);
    if (setting) {
      setting.value = "";
    }

    if (!select) {
      return;
    }

    if (select.updateComplete) {
      await select.updateComplete;
    }

    select.value = "";
    if (select.inputEl) {
      select.inputEl.value = "";
    }

    if (select.updateComplete) {
      await select.updateComplete;
    }
  },

  /**
   * Reset the dropdown back to the placeholder value and underlying setting state.
   */
  async resetAlwaysTranslateSelect() {
    await this.resetSelect(
      this.elements?.alwaysTranslateLanguagesSelect,
      "translationsAlwaysTranslateLanguagesSelect"
    );
    this.updateAlwaysTranslateAddButtonDisabledState();
  },

  /**
   * Refresh the rendered list of always-translate languages to match prefs.
   */
  async refreshAlwaysTranslateLanguages() {
    if (!this.elements?.alwaysTranslateLanguagesGroup) {
      return;
    }

    const langTags = Array.from(
      TranslationsParent.getAlwaysTranslateLanguages?.() ?? []
    );

    if (this.alwaysTranslateLanguageTags) {
      for (const langTag of langTags) {
        if (this.alwaysTranslateLanguageTags.has(langTag)) {
          continue;
        }
        TranslationsParent.removeLangTagFromPref(
          langTag,
          NEVER_TRANSLATE_LANGS_PREF
        );
      }
    }

    this.alwaysTranslateLanguageTags = new Set(langTags);

    this.renderAlwaysTranslateLanguages(langTags);
    await this.updateAlwaysTranslateSelectOptionState();
  },

  /**
   * Render the current set of always-translate languages into the list UI.
   *
   * @param {string[]} langTags
   */
  renderAlwaysTranslateLanguages(langTags) {
    const { alwaysTranslateLanguagesGroup, alwaysTranslateLanguagesNoneRow } =
      this.elements;

    for (const item of alwaysTranslateLanguagesGroup.querySelectorAll(
      `.${ALWAYS_TRANSLATE_LANGUAGE_ITEM_CLASS}`
    )) {
      item.remove();
    }

    const previousEmptyStateVisible =
      alwaysTranslateLanguagesNoneRow &&
      !alwaysTranslateLanguagesNoneRow.hidden;

    if (alwaysTranslateLanguagesNoneRow) {
      const hasLanguages = !!langTags.length;
      alwaysTranslateLanguagesNoneRow.hidden = hasLanguages;

      if (hasLanguages && alwaysTranslateLanguagesNoneRow.isConnected) {
        alwaysTranslateLanguagesNoneRow.remove();
      } else if (
        !hasLanguages &&
        !alwaysTranslateLanguagesNoneRow.isConnected
      ) {
        alwaysTranslateLanguagesGroup.appendChild(
          alwaysTranslateLanguagesNoneRow
        );
      }
    }

    const sortedLangTags = [...langTags].sort((langTagA, langTagB) => {
      const labelA = this.formatLanguageLabel(langTagA) ?? langTagA;
      const labelB = this.formatLanguageLabel(langTagB) ?? langTagB;
      return labelA.localeCompare(labelB);
    });

    for (const langTag of sortedLangTags) {
      const label = this.formatLanguageLabel(langTag);
      if (!label) {
        continue;
      }

      const removeButton = document.createElement("moz-button");
      removeButton.setAttribute("slot", "actions-start");
      removeButton.setAttribute("type", "icon");
      removeButton.setAttribute(
        "iconsrc",
        "chrome://global/skin/icons/delete.svg"
      );
      removeButton.classList.add(ALWAYS_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS);
      removeButton.dataset.langTag = langTag;
      removeButton.setAttribute("aria-label", label);

      const item = document.createElement("moz-box-item");
      item.classList.add(ALWAYS_TRANSLATE_LANGUAGE_ITEM_CLASS);
      item.setAttribute("label", label);
      item.dataset.langTag = langTag;
      item.appendChild(removeButton);
      if (
        alwaysTranslateLanguagesNoneRow &&
        alwaysTranslateLanguagesNoneRow.parentElement ===
          alwaysTranslateLanguagesGroup
      ) {
        alwaysTranslateLanguagesGroup.insertBefore(
          item,
          alwaysTranslateLanguagesNoneRow
        );
      } else {
        alwaysTranslateLanguagesGroup.appendChild(item);
      }
    }

    dispatchTestEvent("AlwaysTranslateLanguagesRendered", {
      languages: langTags,
      count: langTags.length,
    });

    const currentEmptyStateVisible =
      alwaysTranslateLanguagesNoneRow &&
      !alwaysTranslateLanguagesNoneRow.hidden;
    if (previousEmptyStateVisible && !currentEmptyStateVisible) {
      dispatchTestEvent("AlwaysTranslateLanguagesEmptyStateHidden");
    } else if (!previousEmptyStateVisible && currentEmptyStateVisible) {
      dispatchTestEvent("AlwaysTranslateLanguagesEmptyStateShown");
    }
  },

  /**
   * Format a language tag for display using the cached display names.
   *
   * @param {string} langTag
   * @returns {string|null}
   */
  formatLanguageLabel(langTag) {
    try {
      return this.languageDisplayNames?.of(langTag) ?? null;
    } catch (error) {
      console.warn(`Failed to format language label for ${langTag}`, error);
      return null;
    }
  },

  /**
   * Populate the select options for the supported source languages.
   */
  async buildAlwaysTranslateSelectOptions() {
    const select = this.elements?.alwaysTranslateLanguagesSelect;
    if (!select || !this.supportedLanguages?.sourceLanguages?.length) {
      return;
    }

    const placeholder = select.querySelector('moz-option[value=""]');
    for (const option of select.querySelectorAll("moz-option")) {
      if (option !== placeholder) {
        option.remove();
      }
    }

    const sourceLanguages = [...this.supportedLanguages.sourceLanguages].sort(
      (lhs, rhs) =>
        (
          this.formatLanguageLabel(lhs.langTag) ?? lhs.displayName
        ).localeCompare(
          this.formatLanguageLabel(rhs.langTag) ?? rhs.displayName
        )
    );
    for (const { langTag, displayName } of sourceLanguages) {
      const option = document.createElement("moz-option");
      option.setAttribute("value", langTag);
      option.setAttribute(
        "label",
        this.formatLanguageLabel(langTag) ?? displayName
      );
      select.appendChild(option);
    }

    await this.resetAlwaysTranslateSelect();
  },

  /**
   * Disable already-added languages in the select so they cannot be re-added.
   */
  async updateAlwaysTranslateSelectOptionState() {
    const select = this.elements?.alwaysTranslateLanguagesSelect;
    if (!select) {
      return;
    }

    for (const option of select.querySelectorAll("moz-option")) {
      const value = option.getAttribute("value");
      if (!value) {
        continue;
      }
      option.disabled = this.alwaysTranslateLanguageTags.has(value);
    }

    await this.resetAlwaysTranslateSelect();

    dispatchTestEvent("AlwaysTranslateLanguagesSelectOptionsUpdated");
  },

  /**
   * Handle a selection in the "Never translate languages" dropdown.
   *
   * @param {string} langTag
   */
  async onNeverTranslateLanguageChosen(langTag) {
    if (!langTag) {
      this.updateNeverTranslateAddButtonDisabledState();
      return;
    }

    if (this.shouldDisableNeverTranslateAddButton()) {
      this.updateNeverTranslateAddButtonDisabledState();
      return;
    }

    TranslationsParent.addLangTagToPref(langTag, NEVER_TRANSLATE_LANGS_PREF);
    TranslationsParent.removeLangTagFromPref(
      langTag,
      ALWAYS_TRANSLATE_LANGS_PREF
    );
    await this.resetNeverTranslateSelect();
  },

  /**
   * Handle a selection change in the never-translate dropdown.
   */
  onNeverTranslateLanguageSelectionChanged() {
    this.updateNeverTranslateAddButtonDisabledState();
  },

  /**
   * Whether the add button for never-translate languages should be disabled.
   *
   * @returns {boolean}
   */
  shouldDisableNeverTranslateAddButton() {
    const select = this.elements?.neverTranslateLanguagesSelect;
    if (!select || select.disabled) {
      return true;
    }

    const langTag = select.value;
    if (!langTag) {
      return true;
    }

    const option = /** @type {HTMLElement|null} */ (
      select.querySelector(`moz-option[value="${langTag}"]`)
    );
    return option?.hasAttribute("disabled") ?? false;
  },

  /**
   * Set the add button enabled state for never-translate languages.
   *
   * @param {boolean} isDisabled
   */
  setNeverTranslateAddButtonDisabledState(isDisabled) {
    if (!this.elements?.neverTranslateLanguagesButton) {
      return;
    }

    const wasDisabled = this.elements.neverTranslateLanguagesButton.disabled;
    this.elements.neverTranslateLanguagesButton.disabled = isDisabled;
    if (wasDisabled !== isDisabled) {
      dispatchTestEvent(
        isDisabled
          ? "NeverTranslateLanguagesAddButtonDisabled"
          : "NeverTranslateLanguagesAddButtonEnabled"
      );
    }
  },

  /**
   * Update the add button enabled state for never-translate languages.
   */
  updateNeverTranslateAddButtonDisabledState() {
    this.setNeverTranslateAddButtonDisabledState(
      this.shouldDisableNeverTranslateAddButton()
    );
  },

  /**
   * Remove the given language from the never translate list.
   *
   * @param {string} langTag
   */
  removeNeverTranslateLanguage(langTag) {
    TranslationsParent.removeLangTagFromPref(
      langTag,
      NEVER_TRANSLATE_LANGS_PREF
    );
  },

  /**
   * Reset the dropdown back to the placeholder value and underlying setting state.
   */
  async resetNeverTranslateSelect() {
    await this.resetSelect(
      this.elements?.neverTranslateLanguagesSelect,
      "translationsNeverTranslateLanguagesSelect"
    );
    this.updateNeverTranslateAddButtonDisabledState();
  },

  /**
   * Refresh the rendered list of never-translate languages to match prefs.
   */
  async refreshNeverTranslateLanguages() {
    if (!this.elements?.neverTranslateLanguagesGroup) {
      return;
    }

    const langTags = Array.from(
      TranslationsParent.getNeverTranslateLanguages?.() ?? []
    );
    this.neverTranslateLanguageTags = new Set(langTags);

    this.renderNeverTranslateLanguages(langTags);
    await this.updateNeverTranslateSelectOptionState();
  },

  /**
   * Render the current set of never-translate languages into the list UI.
   *
   * @param {string[]} langTags
   */
  renderNeverTranslateLanguages(langTags) {
    const { neverTranslateLanguagesGroup, neverTranslateLanguagesNoneRow } =
      this.elements;

    for (const item of neverTranslateLanguagesGroup.querySelectorAll(
      `.${NEVER_TRANSLATE_LANGUAGE_ITEM_CLASS}`
    )) {
      item.remove();
    }

    const previousEmptyStateVisible =
      neverTranslateLanguagesNoneRow && !neverTranslateLanguagesNoneRow.hidden;

    if (neverTranslateLanguagesNoneRow) {
      const hasLanguages = Boolean(langTags.length);
      neverTranslateLanguagesNoneRow.hidden = hasLanguages;

      if (hasLanguages && neverTranslateLanguagesNoneRow.isConnected) {
        neverTranslateLanguagesNoneRow.remove();
      } else if (!hasLanguages && !neverTranslateLanguagesNoneRow.isConnected) {
        neverTranslateLanguagesGroup.appendChild(
          neverTranslateLanguagesNoneRow
        );
      }
    }

    const sortedLangTags = [...langTags].sort((langTagA, langTagB) => {
      const labelA = this.formatLanguageLabel(langTagA) ?? langTagA;
      const labelB = this.formatLanguageLabel(langTagB) ?? langTagB;
      return labelA.localeCompare(labelB);
    });

    for (const langTag of sortedLangTags) {
      const label = this.formatLanguageLabel(langTag);
      if (!label) {
        continue;
      }

      const removeButton = document.createElement("moz-button");
      removeButton.setAttribute("slot", "actions-start");
      removeButton.setAttribute("type", "icon");
      removeButton.setAttribute(
        "iconsrc",
        "chrome://global/skin/icons/delete.svg"
      );
      removeButton.classList.add(NEVER_TRANSLATE_LANGUAGE_REMOVE_BUTTON_CLASS);
      removeButton.dataset.langTag = langTag;
      removeButton.setAttribute("aria-label", label);

      const item = document.createElement("moz-box-item");
      item.classList.add(NEVER_TRANSLATE_LANGUAGE_ITEM_CLASS);
      item.setAttribute("label", label);
      item.dataset.langTag = langTag;
      item.appendChild(removeButton);
      if (
        neverTranslateLanguagesNoneRow &&
        neverTranslateLanguagesNoneRow.parentElement ===
          neverTranslateLanguagesGroup
      ) {
        neverTranslateLanguagesGroup.insertBefore(
          item,
          neverTranslateLanguagesNoneRow
        );
      } else {
        neverTranslateLanguagesGroup.appendChild(item);
      }
    }

    dispatchTestEvent("NeverTranslateLanguagesRendered", {
      languages: langTags,
      count: langTags.length,
    });

    const currentEmptyStateVisible =
      neverTranslateLanguagesNoneRow && !neverTranslateLanguagesNoneRow.hidden;
    if (previousEmptyStateVisible && !currentEmptyStateVisible) {
      dispatchTestEvent("NeverTranslateLanguagesEmptyStateHidden");
    } else if (!previousEmptyStateVisible && currentEmptyStateVisible) {
      dispatchTestEvent("NeverTranslateLanguagesEmptyStateShown");
    }
  },

  /**
   * Populate the select options for the supported source languages.
   */
  async buildNeverTranslateSelectOptions() {
    const select = this.elements?.neverTranslateLanguagesSelect;
    if (!select || !this.supportedLanguages?.sourceLanguages?.length) {
      return;
    }

    const placeholder = select.querySelector('moz-option[value=""]');
    for (const option of select.querySelectorAll("moz-option")) {
      if (option !== placeholder) {
        option.remove();
      }
    }

    const sourceLanguages = [...this.supportedLanguages.sourceLanguages].sort(
      (lhs, rhs) =>
        (
          this.formatLanguageLabel(lhs.langTag) ?? lhs.displayName
        ).localeCompare(
          this.formatLanguageLabel(rhs.langTag) ?? rhs.displayName
        )
    );
    for (const { langTag, displayName } of sourceLanguages) {
      const option = document.createElement("moz-option");
      option.setAttribute("value", langTag);
      option.setAttribute(
        "label",
        this.formatLanguageLabel(langTag) ?? displayName
      );
      select.appendChild(option);
    }

    await this.resetNeverTranslateSelect();
  },

  /**
   * Disable already-added languages in the select so they cannot be re-added.
   */
  async updateNeverTranslateSelectOptionState() {
    const select = this.elements?.neverTranslateLanguagesSelect;
    if (!select) {
      return;
    }

    for (const option of select.querySelectorAll("moz-option")) {
      const value = option.getAttribute("value");
      if (!value) {
        continue;
      }
      option.disabled = this.neverTranslateLanguageTags.has(value);
    }

    await this.resetNeverTranslateSelect();

    dispatchTestEvent("NeverTranslateLanguagesSelectOptionsUpdated");
  },

  /**
   * Refresh the rendered list of never-translate sites.
   */
  refreshNeverTranslateSites() {
    if (!this.elements?.neverTranslateSitesGroup) {
      return;
    }

    /** @type {string[]} */
    let siteOrigins = [];
    try {
      siteOrigins = TranslationsParent.listNeverTranslateSites() ?? [];
    } catch (error) {
      console.error("Failed to list never translate sites", error);
    }

    this.neverTranslateSiteOrigins = new Set(siteOrigins);
    this.renderNeverTranslateSites(siteOrigins);
  },

  /**
   * Render the never-translate sites list.
   *
   * @param {string[]} siteOrigins
   */
  renderNeverTranslateSites(siteOrigins) {
    const { neverTranslateSitesGroup, neverTranslateSitesNoneRow } =
      this.elements ?? {};
    if (!neverTranslateSitesGroup) {
      return;
    }

    for (const item of neverTranslateSitesGroup.querySelectorAll(
      `.${NEVER_TRANSLATE_SITE_ITEM_CLASS}`
    )) {
      item.remove();
    }

    const previousEmptyStateVisible =
      neverTranslateSitesNoneRow && !neverTranslateSitesNoneRow.hidden;

    if (neverTranslateSitesNoneRow) {
      const hasSites = Boolean(siteOrigins.length);
      neverTranslateSitesNoneRow.hidden = hasSites;

      if (hasSites && neverTranslateSitesNoneRow.isConnected) {
        neverTranslateSitesNoneRow.remove();
      } else if (!hasSites && !neverTranslateSitesNoneRow.isConnected) {
        neverTranslateSitesGroup.appendChild(neverTranslateSitesNoneRow);
      }
    }

    const sortedOrigins = [...siteOrigins].sort((originA, originB) => {
      return this.getSiteSortKey(originA).localeCompare(
        this.getSiteSortKey(originB)
      );
    });

    for (const origin of sortedOrigins) {
      const removeButton = document.createElement("moz-button");
      removeButton.setAttribute("slot", "actions-start");
      removeButton.setAttribute("type", "icon");
      removeButton.setAttribute(
        "iconsrc",
        "chrome://global/skin/icons/delete.svg"
      );
      removeButton.classList.add(NEVER_TRANSLATE_SITE_REMOVE_BUTTON_CLASS);
      removeButton.dataset.origin = origin;
      removeButton.setAttribute("aria-label", origin);

      const item = document.createElement("moz-box-item");
      item.classList.add(NEVER_TRANSLATE_SITE_ITEM_CLASS);
      item.setAttribute("label", origin);
      item.dataset.origin = origin;
      item.appendChild(removeButton);
      if (
        neverTranslateSitesNoneRow &&
        neverTranslateSitesNoneRow.parentElement === neverTranslateSitesGroup
      ) {
        neverTranslateSitesGroup.insertBefore(item, neverTranslateSitesNoneRow);
      } else {
        neverTranslateSitesGroup.appendChild(item);
      }
    }

    dispatchTestEvent("NeverTranslateSitesRendered", {
      sites: siteOrigins,
      count: siteOrigins.length,
    });

    const currentEmptyStateVisible =
      neverTranslateSitesNoneRow && !neverTranslateSitesNoneRow.hidden;
    if (previousEmptyStateVisible && !currentEmptyStateVisible) {
      dispatchTestEvent("NeverTranslateSitesEmptyStateHidden");
    } else if (!previousEmptyStateVisible && currentEmptyStateVisible) {
      dispatchTestEvent("NeverTranslateSitesEmptyStateShown");
    }
  },

  /**
   * Remove a site from the never-translate list.
   *
   * @param {string} origin
   */
  removeNeverTranslateSite(origin) {
    if (!origin || !this.neverTranslateSiteOrigins.has(origin)) {
      return;
    }

    try {
      TranslationsParent.setNeverTranslateSiteByOrigin(false, origin);
    } catch (error) {
      console.error("Failed to remove never translate site", error);
      return;
    }

    this.refreshNeverTranslateSites();
  },

  /**
   * Create a sort key that ignores protocol differences.
   *
   * @param {string} origin
   * @returns {string}
   */
  getSiteSortKey(origin) {
    try {
      return Services.io.newURI(origin).asciiHostPort;
    } catch {
      return origin;
    }
  },

  /**
   * Handle a selection change in the download dropdown.
   */
  onDownloadSelectionChanged() {
    this.updateDownloadLanguageButtonDisabled();
  },

  /**
   * Whether the download button should be disabled based on selection state.
   *
   * @returns {boolean}
   */
  shouldDisableDownloadLanguageButton() {
    const select = this.elements?.downloadLanguagesSelect;
    if (!select || this.currentDownloadLangTag) {
      return true;
    }

    const langTag = select.value;
    if (!langTag) {
      return true;
    }

    const option = /** @type {HTMLElement|null} */ (
      select.querySelector(`moz-option[value="${langTag}"]`)
    );
    return option?.hasAttribute("disabled") ?? false;
  },

  /**
   * Set the download button state and dispatch test events when it changes.
   *
   * @param {boolean} isDisabled
   */
  setDownloadLanguageButtonDisabledState(isDisabled) {
    const button = this.elements?.downloadLanguagesButton;
    if (!button) {
      return;
    }

    const wasDisabled = button.disabled;
    button.disabled = isDisabled;

    if (wasDisabled !== isDisabled) {
      dispatchTestEvent(
        isDisabled
          ? "DownloadLanguageButtonDisabled"
          : "DownloadLanguageButtonEnabled"
      );
    }
  },

  /**
   * Update the enabled state of the download button.
   */
  updateDownloadLanguageButtonDisabled() {
    this.setDownloadLanguageButtonDisabledState(
      this.shouldDisableDownloadLanguageButton()
    );
  },

  /**
   * Handle a click on the download button.
   *
   * @returns {Promise<void>}
   */
  async onDownloadLanguageButtonClicked() {
    const langTag = this.elements?.downloadLanguagesSelect?.value;
    if (!langTag || this.currentDownloadLangTag) {
      return;
    }

    this.downloadPendingDeleteLanguageTags.clear();
    this.downloadFailedLanguageTags.clear();
    this.currentDownloadLangTag = langTag;
    this.downloadingLanguageTags.add(langTag);
    this.setDownloadControlsDisabled(true);
    dispatchTestEvent("DownloadStarted", { langTag });
    await this.renderDownloadLanguages();
    this.updateDownloadSelectOptionState({ preserveSelection: true });

    let downloadSucceeded = false;
    try {
      await TranslationsParent.downloadLanguageFiles(langTag);
      this.downloadedLanguageTags.add(langTag);
      downloadSucceeded = true;
      dispatchTestEvent("DownloadCompleted", { langTag });
    } catch (error) {
      dispatchTestEvent("DownloadFailed", { langTag });
      console.error("Failed to download language files", error);
      this.downloadFailedLanguageTags.add(langTag);
    } finally {
      this.downloadingLanguageTags.delete(langTag);
      this.currentDownloadLangTag = null;
      this.setDownloadControlsDisabled(false);
      await this.renderDownloadLanguages();
      this.updateDownloadSelectOptionState({
        preserveSelection: !downloadSucceeded,
      });
      this.updateDownloadLanguageButtonDisabled();
    }
  },

  /**
   * Disable or enable the download controls.
   *
   * @param {boolean} isDisabled
   */
  setDownloadControlsDisabled(isDisabled) {
    if (this.elements?.downloadLanguagesSelect) {
      this.elements.downloadLanguagesSelect.disabled = isDisabled;
    }
    this.setDownloadLanguageButtonDisabledState(
      isDisabled || this.shouldDisableDownloadLanguageButton()
    );
  },

  /**
   * Toggle ghost styling on icon buttons.
   *
   * @param {HTMLElement|null} button
   * @param {boolean} isGhost
   */
  setIconButtonGhostState(button, isGhost) {
    if (!button) {
      return;
    }
    const type = isGhost ? "icon ghost" : "icon";
    if (button.getAttribute("type") !== type) {
      button.setAttribute("type", type);
    }
  },

  /**
   * Reset the download dropdown back to its placeholder value.
   */
  resetDownloadSelect() {
    if (this.elements?.downloadLanguagesSelect) {
      this.elements.downloadLanguagesSelect.value = "";
    }
    const setting = Preferences.getSetting?.(
      "translationsDownloadLanguagesSelect"
    );
    if (setting) {
      setting.value = "";
    }
    this.updateDownloadLanguageButtonDisabled();
  },

  /**
   * Refresh download state from disk and update the UI.
   *
   * @returns {Promise<void>}
   */
  async refreshDownloadedLanguages() {
    if (!this.languageList?.length) {
      return;
    }

    this.downloadPendingDeleteLanguageTags.clear();
    const downloaded = await Promise.all(
      this.languageList.map(async (/** @type {LanguageInfo} */ { langTag }) => {
        try {
          const hasFiles =
            await TranslationsParent.hasAllFilesForLanguage(langTag);
          return /** @type {[string, boolean]} */ ([langTag, hasFiles]);
        } catch (error) {
          console.error(
            `Failed to check download status for ${langTag}`,
            error
          );
          return /** @type {[string, boolean]} */ ([langTag, false]);
        }
      })
    );

    this.downloadedLanguageTags = new Set(
      downloaded.filter(([, isDownloaded]) => isDownloaded).map(([tag]) => tag)
    );

    for (const [langTag, isDownloaded] of downloaded) {
      if (isDownloaded) {
        this.downloadingLanguageTags.delete(langTag);
        this.downloadFailedLanguageTags.delete(langTag);
      } else {
        this.downloadPendingDeleteLanguageTags.delete(langTag);
      }
    }

    await this.renderDownloadLanguages();
    this.updateDownloadSelectOptionState();
    this.updateDownloadLanguageButtonDisabled();
  },

  /**
   * Create a delete confirmation item with warning icon and action buttons.
   *
   * @param {string} langTag
   * @param {HTMLElement} item - The moz-box-item element to populate.
   * @returns {Promise<void>}
   */
  async createDeleteConfirmationItem(langTag, item, disableActions = false) {
    const warningButton = document.createElement("moz-button");
    warningButton.setAttribute("slot", "actions-start");
    warningButton.setAttribute("type", "icon");
    warningButton.setAttribute("iconsrc", DOWNLOAD_WARNING_ICON);
    warningButton.style.pointerEvents = "none";
    warningButton.style.color = "var(--icon-color-warning)";
    warningButton.classList.add(DOWNLOAD_LANGUAGE_REMOVE_BUTTON_CLASS);
    warningButton.dataset.langTag = langTag;
    this.setIconButtonGhostState(warningButton, true);

    const sizeLabel = this.formatLanguageSize(langTag) ?? "0";
    const languageLabel = this.formatLanguageLabel(langTag) ?? langTag;

    const confirmContent = document.createElement("div");
    confirmContent.style.cssText =
      "display: flex; align-items: center; gap: var(--space-small);";

    const confirmText = document.createElement("span");
    confirmText.textContent = await document.l10n.formatValue(
      "settings-translations-subpage-download-delete-confirm",
      { language: languageLabel, size: sizeLabel }
    );

    const buttonGroup = document.createElement("moz-button-group");

    const deleteButton = document.createElement("moz-button");
    deleteButton.setAttribute("type", "destructive");
    deleteButton.setAttribute("size", "small");
    deleteButton.disabled = disableActions;
    document.l10n.setAttributes(
      deleteButton,
      "settings-translations-subpage-download-delete-button"
    );
    deleteButton.classList.add(DOWNLOAD_LANGUAGE_DELETE_CONFIRM_BUTTON_CLASS);
    deleteButton.dataset.langTag = langTag;

    const cancelButton = document.createElement("moz-button");
    cancelButton.setAttribute("type", "default");
    cancelButton.setAttribute("size", "small");
    cancelButton.disabled = disableActions;
    document.l10n.setAttributes(
      cancelButton,
      "settings-translations-subpage-download-cancel-button"
    );
    cancelButton.classList.add(DOWNLOAD_LANGUAGE_DELETE_CANCEL_BUTTON_CLASS);
    cancelButton.dataset.langTag = langTag;

    confirmContent.appendChild(confirmText);
    buttonGroup.append(deleteButton, cancelButton);
    confirmContent.appendChild(buttonGroup);

    if (!deleteButton.disabled) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (deleteButton.isConnected) {
            deleteButton.focus({ focusVisible: true });
          }
        });
      });
    }

    item.appendChild(warningButton);
    item.appendChild(confirmContent);
  },

  /**
   * Create a failed download item with error icon and retry button.
   *
   * @param {string} langTag
   * @param {HTMLElement} item - The moz-box-item element to populate.
   * @returns {Promise<void>}
   */
  async createFailedDownloadItem(langTag, item, disableActions = false) {
    const errorButton = document.createElement("moz-button");
    errorButton.setAttribute("slot", "actions-start");
    errorButton.setAttribute("type", "icon");
    errorButton.setAttribute("iconsrc", DOWNLOAD_ERROR_ICON);
    errorButton.style.pointerEvents = "none";
    errorButton.style.color = "var(--text-color-error)";
    errorButton.classList.add(DOWNLOAD_LANGUAGE_REMOVE_BUTTON_CLASS);
    errorButton.dataset.langTag = langTag;
    this.setIconButtonGhostState(errorButton, true);

    const sizeLabel = this.formatLanguageSize(langTag) ?? "0";
    const languageLabel = this.formatLanguageLabel(langTag) ?? langTag;

    const errorContent = document.createElement("div");
    errorContent.style.cssText =
      "display: flex; align-items: center; gap: var(--space-small);";

    const errorText = document.createElement("span");
    document.l10n.setAttributes(
      errorText,
      "settings-translations-subpage-download-error",
      { language: languageLabel, size: sizeLabel }
    );

    const retryButton = document.createElement("moz-button");
    retryButton.setAttribute("type", "text");
    retryButton.setAttribute("size", "small");
    retryButton.disabled = disableActions;
    document.l10n.setAttributes(
      retryButton,
      "settings-translations-subpage-download-retry-button"
    );
    retryButton.classList.add(DOWNLOAD_LANGUAGE_RETRY_BUTTON_CLASS);
    retryButton.dataset.langTag = langTag;

    errorContent.appendChild(errorText);
    errorContent.appendChild(retryButton);

    if (!retryButton.disabled) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (retryButton.isConnected) {
            retryButton.focus({ focusVisible: true });
          }
        });
      });
    }

    item.appendChild(errorButton);
    item.appendChild(errorContent);
  },

  /**
   * Create a download/remove button for downloaded or downloading language items.
   *
   * @param {string} langTag
   * @param {boolean} isDownloading
   * @param {HTMLElement} item - The moz-box-item element to populate.
   * @param {string} progressLabel - The localized "Downloading..." text.
   * @returns {Promise<boolean>} - Returns false if the item should be skipped.
   */
  async createDownloadLanguageItem(
    langTag,
    isDownloading,
    item,
    progressLabel,
    disableActions = false
  ) {
    const label = await this.formatDownloadLabel(langTag);
    if (!label) {
      return false;
    }

    const removeButton = document.createElement("moz-button");
    removeButton.setAttribute("slot", "actions-start");
    removeButton.setAttribute("type", "icon");
    removeButton.setAttribute(
      "iconsrc",
      isDownloading ? DOWNLOAD_LOADING_ICON : DOWNLOAD_DELETE_ICON
    );
    removeButton.classList.add(DOWNLOAD_LANGUAGE_REMOVE_BUTTON_CLASS);
    removeButton.dataset.langTag = langTag;
    removeButton.setAttribute("aria-label", label);
    if (isDownloading) {
      removeButton.style.pointerEvents = "none";
      removeButton.disabled = false;
    } else {
      removeButton.disabled = disableActions;
    }
    this.setIconButtonGhostState(
      removeButton,
      isDownloading ||
        removeButton.getAttribute("iconsrc") === DOWNLOAD_LOADING_ICON
    );

    item.setAttribute("label", label);
    if (isDownloading) {
      item.setAttribute("description", progressLabel);
    }

    item.appendChild(removeButton);
    return true;
  },

  /**
   * Render the downloaded (and downloading) languages list.
   *
   * @returns {Promise<void>}
   */
  async renderDownloadLanguages() {
    const { downloadLanguagesGroup, downloadLanguagesNoneRow } =
      this.elements ?? {};
    if (!downloadLanguagesGroup) {
      return;
    }

    const isDownloadInProgress = Boolean(this.currentDownloadLangTag);
    const previousEmptyStateVisible =
      downloadLanguagesNoneRow && !downloadLanguagesNoneRow.hidden;

    for (const item of downloadLanguagesGroup.querySelectorAll(
      `.${DOWNLOAD_LANGUAGE_ITEM_CLASS}`
    )) {
      item.remove();
    }

    const langTags = [
      ...Array.from(
        new Set([
          ...Array.from(this.downloadedLanguageTags),
          ...Array.from(this.downloadingLanguageTags),
          ...Array.from(this.downloadFailedLanguageTags),
        ])
      ),
    ];

    if (downloadLanguagesNoneRow) {
      const hasLanguages = !!langTags.length;
      downloadLanguagesNoneRow.hidden = hasLanguages;

      if (hasLanguages && downloadLanguagesNoneRow.isConnected) {
        downloadLanguagesNoneRow.remove();
      } else if (!hasLanguages && !downloadLanguagesNoneRow.isConnected) {
        downloadLanguagesGroup.appendChild(downloadLanguagesNoneRow);
      }
    }

    const currentEmptyStateVisible =
      downloadLanguagesNoneRow && !downloadLanguagesNoneRow.hidden;
    if (previousEmptyStateVisible && !currentEmptyStateVisible) {
      dispatchTestEvent("DownloadedLanguagesEmptyStateHidden");
    } else if (!previousEmptyStateVisible && currentEmptyStateVisible) {
      dispatchTestEvent("DownloadedLanguagesEmptyStateShown");
    }

    const sortedLangTags = [...langTags].sort((lhs, rhs) => {
      const labelA = this.formatLanguageLabel(lhs) ?? lhs;
      const labelB = this.formatLanguageLabel(rhs) ?? rhs;
      return labelA.localeCompare(labelB);
    });

    const progressLabel = await document.l10n.formatValue(
      "settings-translations-subpage-download-progress"
    );

    for (const langTag of sortedLangTags) {
      const isDownloading = this.downloadingLanguageTags.has(langTag);
      const isFailed = this.downloadFailedLanguageTags.has(langTag);
      const isPendingDelete =
        this.downloadPendingDeleteLanguageTags.has(langTag);

      const item = document.createElement("moz-box-item");
      item.classList.add(DOWNLOAD_LANGUAGE_ITEM_CLASS);
      item.dataset.langTag = langTag;

      if (isPendingDelete) {
        await this.createDeleteConfirmationItem(
          langTag,
          item,
          isDownloadInProgress
        );
      } else if (isFailed) {
        item.classList.add(DOWNLOAD_LANGUAGE_FAILED_CLASS);
        await this.createFailedDownloadItem(
          langTag,
          item,
          isDownloadInProgress
        );
      } else {
        const shouldAdd = await this.createDownloadLanguageItem(
          langTag,
          isDownloading,
          item,
          progressLabel,
          isDownloadInProgress
        );
        if (!shouldAdd) {
          continue;
        }
      }

      if (
        downloadLanguagesNoneRow &&
        downloadLanguagesNoneRow.parentElement === downloadLanguagesGroup
      ) {
        downloadLanguagesGroup.insertBefore(item, downloadLanguagesNoneRow);
      } else {
        downloadLanguagesGroup.appendChild(item);
      }
    }

    dispatchTestEvent("DownloadedLanguagesRendered", {
      languages: sortedLangTags,
      count: sortedLangTags.length,
      downloading: sortedLangTags.filter(langTag =>
        this.downloadingLanguageTags.has(langTag)
      ),
    });
  },

  /**
   * Show delete confirmation UI when delete button is clicked.
   *
   * @param {string} langTag
   * @returns {Promise<void>}
   */
  async onDeleteButtonClicked(langTag) {
    if (!langTag || !this.downloadedLanguageTags.has(langTag)) {
      return;
    }

    this.downloadFailedLanguageTags.clear();
    this.downloadPendingDeleteLanguageTags.clear();
    this.downloadPendingDeleteLanguageTags.add(langTag);
    await this.renderDownloadLanguages();
  },

  /**
   * Confirm and complete deletion of a language.
   *
   * @param {string} langTag
   * @returns {Promise<void>}
   */
  async confirmDeleteLanguage(langTag) {
    if (!langTag || !this.downloadPendingDeleteLanguageTags.has(langTag)) {
      return;
    }

    this.downloadPendingDeleteLanguageTags.delete(langTag);

    try {
      await TranslationsParent.deleteLanguageFiles(langTag);
      this.downloadedLanguageTags.delete(langTag);
      dispatchTestEvent("DownloadDeleted", { langTag });
    } catch (error) {
      console.error("Failed to remove downloaded language files", error);
      await this.renderDownloadLanguages();
      return;
    }

    await this.renderDownloadLanguages();
    this.updateDownloadSelectOptionState();
    this.updateDownloadLanguageButtonDisabled();
  },

  /**
   * Cancel delete confirmation and restore normal state.
   *
   * @param {string} langTag
   * @returns {Promise<void>}
   */
  async cancelDeleteLanguage(langTag) {
    if (!langTag || !this.downloadPendingDeleteLanguageTags.has(langTag)) {
      return;
    }

    this.downloadPendingDeleteLanguageTags.delete(langTag);
    await this.renderDownloadLanguages();
  },

  /**
   * Retry downloading a failed language.
   *
   * @param {string} langTag
   * @returns {Promise<void>}
   */
  async retryDownloadLanguage(langTag) {
    if (!langTag || !this.downloadFailedLanguageTags.has(langTag)) {
      return;
    }

    this.downloadFailedLanguageTags.delete(langTag);
    this.currentDownloadLangTag = langTag;
    this.downloadingLanguageTags.add(langTag);
    this.setDownloadControlsDisabled(true);
    dispatchTestEvent("DownloadStarted", { langTag });
    await this.renderDownloadLanguages();
    this.updateDownloadSelectOptionState({ preserveSelection: true });

    let downloadSucceeded = false;
    try {
      await TranslationsParent.downloadLanguageFiles(langTag);
      this.downloadedLanguageTags.add(langTag);
      downloadSucceeded = true;
      dispatchTestEvent("DownloadCompleted", { langTag });
    } catch (error) {
      console.error("Failed to download language files", error);
      this.downloadFailedLanguageTags.add(langTag);
      dispatchTestEvent("DownloadFailed", { langTag });
    } finally {
      this.downloadingLanguageTags.delete(langTag);
      this.currentDownloadLangTag = null;
      this.setDownloadControlsDisabled(false);
      await this.renderDownloadLanguages();
      this.updateDownloadSelectOptionState({
        preserveSelection: !downloadSucceeded,
      });
      this.updateDownloadLanguageButtonDisabled();
    }
  },

  /**
   * Handle updates to translations permissions.
   *
   * @param {nsISupports} subject
   * @param {string} data
   */
  handlePermissionChange(subject, data) {
    if (data === "cleared") {
      this.neverTranslateSiteOrigins = new Set();
      this.renderNeverTranslateSites([]);
      return;
    }

    const perm = subject?.QueryInterface?.(Ci.nsIPermission);
    if (perm?.type !== TRANSLATIONS_PERMISSION) {
      return;
    }

    this.refreshNeverTranslateSites();
  },

  /**
   * Remove observers and listeners added during init.
   */
  teardown() {
    try {
      Services.obs.removeObserver(this, TOPIC_TRANSLATIONS_PREF_CHANGED);
      Services.obs.removeObserver(this, "perm-changed");
    } catch (e) {
      // Ignore if we were never added.
    }
    document.removeEventListener("paneshown", this);
    window.removeEventListener("unload", this);
    this.elements?.alwaysTranslateLanguagesSelect?.removeEventListener(
      "change",
      this
    );
    this.elements?.alwaysTranslateLanguagesGroup?.removeEventListener(
      "click",
      this
    );
    this.elements?.alwaysTranslateLanguagesButton?.removeEventListener(
      "click",
      this
    );
    this.elements?.neverTranslateLanguagesSelect?.removeEventListener(
      "change",
      this
    );
    this.elements?.neverTranslateLanguagesButton?.removeEventListener(
      "click",
      this
    );
    this.elements?.neverTranslateLanguagesGroup?.removeEventListener(
      "click",
      this
    );
    this.elements?.neverTranslateSitesGroup?.removeEventListener("click", this);
    this.elements?.downloadLanguagesSelect?.removeEventListener("change", this);
    this.elements?.downloadLanguagesGroup?.removeEventListener("click", this);
    this.elements?.downloadLanguagesButton?.removeEventListener("click", this);
  },
};

document.addEventListener("paneshown", TranslationsSettings);
