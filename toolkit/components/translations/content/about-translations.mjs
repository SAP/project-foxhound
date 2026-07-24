/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The following globals are injected via the AboutTranslationsChild actor.
// about-translations.mjs is running in an unprivileged context, and these injected functions
// allow for the page to get access to additional privileged features.

/* global AT_getAppLocale, AT_getSupportedLanguages, AT_log, AT_getScriptDirection,
   AT_getDisplayName, AT_logError, AT_createTranslationsPort, AT_isHtmlTranslation,
   AT_isTranslationEngineSupported, AT_isInAutomation, AT_identifyLanguage,
   AT_openSupportPage, AT_telemetry */

import { Translator } from "chrome://global/content/translations/Translator.mjs";

/**
 * Allows tests to override the delay milliseconds so that they can run faster.
 */
window.DEBOUNCE_DELAY = 200;

/**
 * The default duration, in milliseconds, that the copy button remains in the "copied" state
 * before reverting back to its default state.
 */
window.COPY_BUTTON_RESET_DELAY = 1500;

/**
 * Tests can set this to true to manually trigger copy button resets.
 *
 * When enabled, the copy button will remain in its copied state until tests
 * call {@link AboutTranslations.testResetCopyButton}.
 *
 * @type {boolean}
 */
window.testManualCopyButtonReset = false;

/**
 * Limits how long the "text" parameter can be in the URL.
 */
const URL_MAX_TEXT_LENGTH = 5000;

/**
 * @typedef {import("../translations").LanguagePair} LanguagePair
 * @typedef {import("../translations").SupportedLanguages} SupportedLanguages
 */

class AboutTranslations {
  /**
   * The set of languages that are supported by the Translations feature.
   *
   * @type {SupportedLanguages}
   */
  #supportedLanguages;

  /**
   * A monotonically increasing number that represents a unique ID
   * for each translation request.
   *
   * @type {number}
   */
  #translationId = 0;

  /**
   * Whether the Translations feature is enabled for this page.
   *
   * @type {boolean}
   */
  #isFeatureEnabled = true;

  /**
   * Whether the current system supports the translations engine.
   *
   * @type {boolean}
   */
  #isTranslationsEngineSupported;

  /**
   * The previous source text that was translated.
   *
   * This is used to calculate the difference of lengths in the texts,
   * which informs whether we should display a translating placeholder.
   *
   * @type {string}
   */
  #previousSourceText = "";

  /**
   * The BCP-47 language tag of the currently detected language.
   *
   * Defaults to an empty string if the detect-language option is not selected,
   * or if the detector was not confident enough to determine a language tag.
   *
   * @type {string}
   */
  #detectedLanguage = "";

  /**
   * The translator for the current language pair.
   *
   * @type {null | Translator}
   */
  #translator = null;

  /**
   * The elements that comprise the about:translations UI.
   *
   * Use the {@link AboutTranslations#elements} getter to instantiate and retrieve them.
   *
   * @type {Record<string, Element>}
   */
  #lazyElements;

  /**
   * The localized placeholder text to display when translating.
   *
   * @type {string}
   */
  #translatingPlaceholderText;

  /**
   * A promise that resolves when the about:translations UI has successfully initialized,
   * or rejects if the UI failed to initialize.
   *
   * @type {PromiseWithResolvers}
   */
  #readyPromiseWithResolvers = Promise.withResolvers();

  /**
   * A timeout id for resetting the copy button's "copied" state.
   *
   * @type {number | null}
   */
  #copyButtonResetTimeoutId = null;

  /**
   * The orientation of the page's content.
   *
   * When the page orientation is horizontal the source and target sections
   * are displayed side by side with the source section at the inline start
   * and the target section at the inline end.
   *
   * When the page orientation is vertical the source section is displayed
   * above the target section, independent of locale bidirectionality.
   *
   * When the page orientation is vertical, each section spans the full width
   * of the content, and resizing the window width or changing the zoom level
   * must trigger section resizing, whereas those updates are not necessary
   * when the page orientation is horizontal.
   *
   * @type {("vertical"|"horizontal")}
   */
  #pageOrientation = "horizontal";

  /**
   * A timeout id that gets set when a pending callback is scheduled
   * to update the section heights.
   *
   * This helps ensure that we do not make repeated calls to this function
   * that would cause unnecessary and excessive reflow.
   *
   * @type {number | null}
   */
  #updateSectionHeightsTimeoutId = null;

  /**
   * Returns the maximum of the given numbers, rounded up.
   *
   * @param  {...number} numbers
   *
   * @returns {number}
   */
  static #maxInteger(...numbers) {
    return Math.ceil(Math.max(...numbers));
  }

  /**
   * Constructs a new {@link AboutTranslations} instance.
   *
   * @param {boolean} isTranslationsEngineSupported
   *        Whether the translations engine is supported by the current system.
   */
  constructor(isTranslationsEngineSupported) {
    this.#isTranslationsEngineSupported = isTranslationsEngineSupported;

    AT_telemetry("onOpen", {
      maintainFlow: false,
    });

    if (!isTranslationsEngineSupported) {
      this.#readyPromiseWithResolvers.reject();
      this.#showUnsupportedInfoMessage();
      return;
    }

    this.#setup()
      .then(() => {
        this.#readyPromiseWithResolvers.resolve();
      })
      .catch(error => {
        AT_logError(error);
        this.#readyPromiseWithResolvers.reject(error);
        this.#showLanguageLoadErrorMessage();
      });
  }

  /**
   * Resolves when the about:translations page has successfully initialized.
   *
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#readyPromiseWithResolvers.promise;
  }

  /**
   * Enables the feature and updates the UI to match the enabled state.
   *
   * @returns {Promise<void>}
   */
  async onFeatureEnabled() {
    this.#isFeatureEnabled = true;

    if (!this.#isTranslationsEngineSupported) {
      this.#showUnsupportedInfoMessage();
      document.body.style.visibility = "visible";
      return;
    }

    if (!this.#supportedLanguages) {
      this.#showLanguageLoadErrorMessage();
      document.body.style.visibility = "visible";
      return;
    }

    this.#updateSourceScriptDirection();
    this.#updateTargetScriptDirection();
    this.#updateSourceSectionClearButtonVisibility();
    this.#requestSectionHeightsUpdate({ scheduleCallback: false });
    this.#maybeRequestTranslation();

    document.body.style.visibility = "visible";
    this.#setInitialFocus();
  }

  /**
   * Disables the feature and clears any active translations.
   */
  onFeatureDisabled() {
    // Ensure any active translation request becomes stale.
    this.#translationId += 1;
    this.#isFeatureEnabled = false;
    this.#destroyTranslator();

    document.body.style.visibility = "hidden";
  }

  /**
   * Instantiates and returns the elements that comprise the UI.
   *
   * @returns {{
   *   copyButton: HTMLElement,
   *   detectLanguageOption: HTMLElement,
   *   languageLoadErrorMessage: HTMLElement,
   *   learnMoreLink: HTMLAnchorElement,
   *   mainUserInterface: HTMLElement,
   *   sourceLanguageSelector: HTMLElement,
   *   sourceSection: HTMLElement,
   *   sourceSectionActionsColumn: HTMLElement,
   *   sourceSectionClearButton: HTMLElement,
   *   sourceSectionTextArea: HTMLTextAreaElement,
   *   swapLanguagesButton: HTMLElement,
   *   targetLanguageSelector: HTMLElement,
   *   targetSection: HTMLElement,
   *   targetSectionActionsRow: HTMLElement,
   *   targetSectionTextArea: HTMLTextAreaElement,
   *   unsupportedInfoMessage: HTMLElement,
   * }}
   */
  get elements() {
    if (this.#lazyElements) {
      return this.#lazyElements;
    }

    this.#lazyElements = {
      copyButton: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-copy-button")
      ),
      detectLanguageOption: /** @type {HTMLElement} */ (
        document.getElementById(
          "about-translations-detect-language-label-option"
        )
      ),
      languageLoadErrorMessage: /** @type {HTMLElement} */ (
        document.getElementById(
          "about-translations-language-load-error-message"
        )
      ),
      learnMoreLink: /** @type {HTMLAnchorElement} */ (
        document.getElementById("about-translations-learn-more-link")
      ),
      mainUserInterface: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-main-user-interface")
      ),
      sourceLanguageSelector: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-source-select")
      ),
      sourceSection: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-source-section")
      ),
      sourceSectionActionsColumn: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-source-actions")
      ),
      sourceSectionClearButton: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-clear-button")
      ),
      sourceSectionTextArea: /** @type {HTMLTextAreaElement} */ (
        document.getElementById("about-translations-source-textarea")
      ),
      swapLanguagesButton: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-swap-languages-button")
      ),
      targetLanguageSelector: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-target-select")
      ),
      targetSection: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-target-section")
      ),
      targetSectionActionsRow: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-target-actions")
      ),
      targetSectionTextArea: /** @type {HTMLTextAreaElement} */ (
        document.getElementById("about-translations-target-textarea")
      ),
      unsupportedInfoMessage: /** @type {HTMLElement} */ (
        document.getElementById("about-translations-unsupported-info-message")
      ),
    };

    return this.#lazyElements;
  }

  /**
   * Sets the internal data member for which orientation the page is in.
   *
   * This information is important for performance regarding in which situations
   * we need to dynamically resize the <textarea> elements on the page.
   *
   * @returns {boolean} True if the page orientation changed, otherwise false.
   */
  #updatePageOrientation() {
    const orientationAtStart = this.#pageOrientation;

    // Keep this value up to date with the media query rule in about-translations.css
    this.#pageOrientation =
      window.innerWidth > 1200 ? "horizontal" : "vertical";

    const orientationChanged = orientationAtStart !== this.#pageOrientation;

    if (orientationChanged) {
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:PageOrientationChanged", {
          detail: { orientation: this.#pageOrientation },
        })
      );
    }

    return orientationChanged;
  }

  /**
   * An async setup function to initialize the about:translations page.
   *
   * Performs all initialization steps and finally reveals the main UI.
   */
  async #setup() {
    this.#initializeEventListeners();
    this.#updatePageOrientation();

    this.#translatingPlaceholderText = await document.l10n.formatValue(
      "about-translations-translating-message"
    );

    await this.#setupLanguageSelectors();
    await this.#updateUIFromURL();

    // Even though we just updated the UI from the URL, this will
    // clear any invalid parameters that may have been passed in the URL.
    this.#updateURLFromUI();

    this.#updateSourceScriptDirection();
    this.#updateTargetScriptDirection();

    this.#showMainUserInterface();
    this.#updateSourceSectionClearButtonVisibility();
    this.#requestSectionHeightsUpdate({ scheduleCallback: false });
  }

  /**
   * Populates the language selector elements with supported languages.
   *
   * This is a one-time operation performed during initialization.
   */
  async #populateLanguageSelectors() {
    this.#supportedLanguages = await AT_getSupportedLanguages();

    const { sourceLanguageSelector, targetLanguageSelector } = this.elements;

    for (const { langTagKey, displayName } of this.#supportedLanguages
      .sourceLanguages) {
      const option = document.createElement("moz-option");
      option.value = langTagKey;
      option.setAttribute("label", displayName);
      sourceLanguageSelector.append(option);
    }

    for (const { langTagKey, displayName } of this.#supportedLanguages
      .targetLanguages) {
      const option = document.createElement("moz-option");
      option.value = langTagKey;
      option.setAttribute("label", displayName);
      targetLanguageSelector.append(option);
    }
  }

  /**
   * Sets up the language selectors during initialization.
   */
  async #setupLanguageSelectors() {
    await this.#populateLanguageSelectors();

    const { sourceLanguageSelector, targetLanguageSelector } = this.elements;
    this.#resetDetectLanguageOptionText();
    sourceLanguageSelector.value = "detect";
    targetLanguageSelector.value = "";
    sourceLanguageSelector.disabled = false;
    targetLanguageSelector.disabled = false;
  }

  /**
   * Initializes all relevant event listeners for the UI elements.
   */
  #initializeEventListeners() {
    const {
      copyButton,
      learnMoreLink,
      sourceLanguageSelector,
      sourceSectionActionsColumn,
      sourceSectionClearButton,
      sourceSectionTextArea,
      swapLanguagesButton,
      targetLanguageSelector,
      targetSectionActionsRow,
      targetSectionTextArea,
    } = this.elements;

    copyButton.addEventListener("click", this.#onCopyButton);
    learnMoreLink.addEventListener("click", this.#onLearnMoreLink);
    sourceLanguageSelector.addEventListener(
      "change",
      this.#onSourceLanguageInput
    );
    sourceSectionActionsColumn.addEventListener(
      "pointerdown",
      this.#onSourceSectionActionsPointerDown
    );
    sourceSectionClearButton.addEventListener(
      "click",
      this.#onSourceSectionClearButton
    );
    sourceSectionClearButton.addEventListener(
      "mousedown",
      this.#onSourceSectionClearButtonMouseDown
    );
    sourceSectionTextArea.addEventListener("input", this.#onSourceTextInput);
    sourceSectionTextArea.addEventListener(
      "focus",
      this.#onSourceTextAreaFocus
    );
    sourceSectionTextArea.addEventListener("blur", this.#onSourceTextAreaBlur);
    swapLanguagesButton.addEventListener("click", this.#onSwapLanguagesButton);
    targetLanguageSelector.addEventListener(
      "change",
      this.#onTargetLanguageInput
    );
    targetSectionTextArea.addEventListener(
      "focus",
      this.#onTargetTextAreaFocus
    );
    targetSectionTextArea.addEventListener("blur", this.#onTargetTextAreaBlur);
    targetSectionActionsRow.addEventListener(
      "pointerdown",
      this.#onTargetSectionActionsPointerDown
    );
    window.addEventListener("resize", this.#onResize);
    window.visualViewport.addEventListener("resize", this.#onResize);
  }

  /**
   * Handles clicks on the learn-more link.
   */
  #onLearnMoreLink = () => {
    AT_openSupportPage();
  };

  /**
   * Handles mousedown on the source section clear button.
   */
  #onSourceSectionClearButtonMouseDown = event => {
    if (this.elements.sourceSection.classList.contains("focus-section")) {
      // When the source section has a focus outline, clicking the clear button will cause the outline
      // to disappear and then reappear since clicking the clear button re-focuses the source section.
      // We should just avoid the outline flash all together when the source section is focused.
      event.preventDefault();
    }
  };

  /**
   * Handles clicks on the source section clear button.
   */
  #onSourceSectionClearButton = event => {
    if (!this.#sourceTextAreaHasValue()) {
      return;
    }

    event.preventDefault();
    this.#setSourceText("");
    this.#maybeUpdateDetectedSourceLanguage();
    this.elements.sourceSectionTextArea.focus();
  };

  /**
   * Handles clicks on the swap-languages button.
   */
  #onSwapLanguagesButton = () => {
    this.#disableSwapLanguagesButton();
    this.#maybeSwapLanguages();
    this.#maybeRequestTranslation();
  };

  /**
   * Handles change events on the source-language selector.
   */
  #onSourceLanguageInput = () => {
    const { sourceLanguageSelector } = this.elements;

    if (sourceLanguageSelector.value !== this.#detectedLanguage) {
      this.#resetDetectLanguageOptionText();
      this.#disableSwapLanguagesButton();
    } else {
      this.#resetDetectLanguageOptionText();
      return;
    }

    this.#maybeRequestTranslation();
  };

  /**
   * Handles change events on the target-language selector.
   */
  #onTargetLanguageInput = () => {
    this.#disableSwapLanguagesButton();
    this.#maybeRequestTranslation();
  };

  /**
   * Handles input events on the source textarea.
   */
  #onSourceTextInput = () => {
    this.#updateSourceSectionClearButtonVisibility();
    this.#maybeRequestTranslation();
  };

  /**
   * Handles pointerdown events within the source section's actions column.
   *
   * Clicking empty space within the column should behave as though the
   * textarea was clicked, but clicking the clear button should preserve
   * the default behavior.
   */
  #onSourceSectionActionsPointerDown = event => {
    if (event.target?.closest?.("#about-translations-clear-button")) {
      return;
    }

    event.preventDefault();
    this.elements.sourceSectionTextArea.focus();
  };

  /**
   * Handles focusing the source section by outlining the entire section.
   */
  #onSourceTextAreaFocus = () => {
    this.elements.sourceSection.classList.add("focus-section");
  };

  /**
   * Handles blur events on the source section's text area.
   */
  #onSourceTextAreaBlur = () => {
    this.elements.sourceSection.classList.remove("focus-section");
  };

  /**
   * Handles pointerdown events within the target section's actions row.
   *
   * Clicking empty space within the actions row should behave as though
   * the textarea was clicked, but clicking a specific action, such as the
   * copy button, should have the default behavior for that element.
   */
  #onTargetSectionActionsPointerDown = event => {
    if (event.target?.closest?.("#about-translations-copy-button")) {
      // The copy button was clicked: preserve the default behavior.
      return;
    }

    // Empty space within the actions row was clicked: focus the text area.
    event.preventDefault();
    this.elements.targetSectionTextArea.focus();
  };

  /**
   * Handles the custom effects for focusing the target section's text area,
   * which should outline the entire section, instead of only the text area.
   */
  #onTargetTextAreaFocus = () => {
    this.elements.targetSection.classList.add("focus-section");
  };

  /**
   * Handles the custom effects for blur events on the target section's text area.
   */
  #onTargetTextAreaBlur = () => {
    this.elements.targetSection.classList.remove("focus-section");
  };

  /**
   * Handles copying the translated text to the clipboard when the copy button is invoked.
   */
  #onCopyButton = async () => {
    const { copyButton, targetSectionTextArea } = this.elements;
    if (copyButton.disabled) {
      return;
    }

    const targetText = targetSectionTextArea.value;
    if (!targetText) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable.");
      }
      await navigator.clipboard.writeText(targetText);
    } catch (error) {
      AT_logError(error);
      return;
    }

    this.#showCopyButtonCopiedState();
  };

  /**
   * Handles resize events, including resizing the window and zooming.
   */
  #onResize = () => {
    const orientationChanged = this.#updatePageOrientation();

    if (orientationChanged) {
      this.#requestSectionHeightsUpdate({ scheduleCallback: false });
    } else if (this.#pageOrientation === "vertical") {
      this.#requestSectionHeightsUpdate({ scheduleCallback: true });
    }
  };

  /**
   * Shows the main UI and hides any stand-alone message bars.
   */
  #showMainUserInterface() {
    const {
      unsupportedInfoMessage,
      languageLoadErrorMessage,
      mainUserInterface,
    } = this.elements;

    unsupportedInfoMessage.style.display = "none";
    languageLoadErrorMessage.style.display = "none";

    mainUserInterface.style.display = "grid";
  }

  /**
   * Shows the message that translations are not supported in the current environment.
   */
  #showUnsupportedInfoMessage() {
    const {
      unsupportedInfoMessage,
      languageLoadErrorMessage,
      mainUserInterface,
    } = this.elements;

    mainUserInterface.style.display = "none";
    languageLoadErrorMessage.style.display = "none";

    unsupportedInfoMessage.style.display = "flex";
  }

  /**
   * Shows the message that the list of languages could not be loaded.
   */
  #showLanguageLoadErrorMessage() {
    const {
      unsupportedInfoMessage,
      languageLoadErrorMessage,
      mainUserInterface,
    } = this.elements;

    mainUserInterface.style.display = "none";
    unsupportedInfoMessage.style.display = "none";

    languageLoadErrorMessage.style.display = "flex";
  }

  /**
   * Returns the language pair formed by the values of the language selectors.
   * Returns null if one or more of the selectors has no selected value.
   *
   * @returns {null | LanguagePair}
   */
  #getSelectedLanguagePair() {
    const { sourceLanguageSelector, targetLanguageSelector } = this.elements;

    let selectedSourceLanguage;
    if (this.#isDetectLanguageSelected()) {
      selectedSourceLanguage = this.#detectedLanguage;
    } else {
      selectedSourceLanguage = sourceLanguageSelector.value;
    }

    const [sourceLanguage, sourceVariant] = selectedSourceLanguage.split(",");
    const [targetLanguage, targetVariant] =
      targetLanguageSelector.value.split(",");

    if (sourceLanguage === "" || targetLanguage === "") {
      // At least one selector is empty, so we cannot create a language pair.
      return null;
    }

    return {
      sourceLanguage,
      targetLanguage,
      sourceVariant,
      targetVariant,
    };
  }

  /**
   * Returns true if we do not yet support the detected language for Translations,
   * otherwise false.
   *
   * @returns {boolean}
   */
  #isDetectedLanguageUnsupported() {
    if (!this.#isDetectLanguageSelected()) {
      // The detect-language option is not selected so this is not relevant.
      return false;
    }

    return !this.elements.sourceLanguageSelector.querySelector(
      `[value^=${this.#detectedLanguage}]`
    );
  }

  /**
   * Returns true if the source-language selector is set to the detect-language
   * option, otherwise false.
   *
   * @returns {boolean}
   */
  #isDetectLanguageSelected() {
    return this.elements.sourceLanguageSelector.value === "detect";
  }

  /**
   * Updates the display value of the source-language selector with the identified
   * language of the source text, only if the source-language selector is set to
   * the detect-language option.
   */
  async #maybeUpdateDetectedSourceLanguage() {
    if (!this.#isDetectLanguageSelected()) {
      this.#resetDetectLanguageOptionText();
      return;
    }

    const detectedLanguage = await this.#identifySourceLanguage();
    if (!this.#isDetectLanguageSelected()) {
      this.#resetDetectLanguageOptionText();
      return;
    }

    const previousDetectedLanguage = this.#detectedLanguage;
    this.#detectedLanguage = detectedLanguage;

    const { sourceSectionTextArea } = this.elements;

    if (detectedLanguage) {
      const displayName = await AT_getDisplayName(detectedLanguage);
      this.#populateDetectLanguageOption({ detectedLanguage, displayName });
      sourceSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(detectedLanguage)
      );
    } else {
      this.#resetDetectLanguageOptionText();
      sourceSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(AT_getAppLocale())
      );
    }

    if (previousDetectedLanguage !== detectedLanguage) {
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:DetectedLanguageUpdated", {
          detail: { language: detectedLanguage },
        })
      );
    }
  }

  /**
   * Sets the label of the about-translations-detect option in the
   * about-translations-source-select dropdown.
   *
   * Passing an empty display name will reset to the default string.
   * Passing a display name will set the text to the given language.
   *
   * @param {object} params
   * @param {string} params.detectedLanguage - The BCP-47 language tag of the detected language.
   * @param {string} params.displayName - The display name of the detected language.
   */
  #populateDetectLanguageOption({ detectedLanguage, displayName }) {
    const { detectLanguageOption } = this.elements;
    detectLanguageOption.setAttribute("language", detectedLanguage);
    document.l10n.setAttributes(
      detectLanguageOption,
      "about-translations-detect-language-label",
      { language: displayName }
    );
  }

  /**
   * Restores the detect-language option to its default value.
   */
  #resetDetectLanguageOptionText() {
    const { detectLanguageOption } = this.elements;
    this.#detectedLanguage = "";
    detectLanguageOption.removeAttribute("language");
    document.l10n.setAttributes(
      detectLanguageOption,
      "about-translations-detect-default-label"
    );
  }

  /**
   * Returns true if the source-language selector contains the given language,
   * otherwise false.
   *
   * @param {string} language - A BCP-47 language tag or prefix.
   * @returns {boolean}
   */
  #sourceSelectorHasLanguage(language) {
    return this.elements.sourceLanguageSelector.querySelector(
      `[value^=${language}]`
    );
  }

  /**
   * Returns true if the target-language selector contains the given language,
   * otherwise false.
   *
   * @param {string} language - A BCP-47 language tag or prefix.
   * @returns {boolean}
   */
  #targetSelectorHasLanguage(language) {
    return this.elements.targetLanguageSelector.querySelector(
      `[value^=${language}]`
    );
  }

  /**
   * Determines whether the currently selected source/target languages can be swapped.
   *
   * @returns {boolean}
   */
  #selectedLanguagePairIsSwappable() {
    const selectedLanguagePair = this.#getSelectedLanguagePair();
    return (
      // There is an actively selected language pair.
      selectedLanguagePair &&
      // The source and target languages are different languages.
      selectedLanguagePair.sourceLanguage !==
        selectedLanguagePair.targetLanguage &&
      // The source language list contains the currently selected target language.
      this.#sourceSelectorHasLanguage(selectedLanguagePair.targetLanguage) &&
      // The target language list contains the currently selected source language.
      this.#targetSelectorHasLanguage(selectedLanguagePair.sourceLanguage)
    );
  }

  /**
   * Disables the swap-languages button.
   */
  #disableSwapLanguagesButton() {
    const { swapLanguagesButton } = this.elements;
    if (swapLanguagesButton.disabled === true) {
      return;
    }

    swapLanguagesButton.disabled = true;
    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:SwapLanguagesButtonDisabled")
    );
  }

  /**
   * Enables the swap-languages button.
   */
  #enableSwapLanguagesButton() {
    const { swapLanguagesButton } = this.elements;
    if (swapLanguagesButton.disabled === false) {
      return;
    }

    swapLanguagesButton.disabled = false;
    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:SwapLanguagesButtonEnabled")
    );
  }

  /**
   * Updates the enabled state of the swap-languages button based on the current
   * values of the language selectors.
   */
  #updateSwapLanguagesButtonEnabledState() {
    if (this.#selectedLanguagePairIsSwappable()) {
      this.#enableSwapLanguagesButton();
    } else {
      this.#disableSwapLanguagesButton();
    }
  }

  /**
   * Updates the enabled state of the copy button.
   *
   * @param {boolean} shouldEnable
   */
  #setCopyButtonEnabled(shouldEnable) {
    const { copyButton } = this.elements;

    if (copyButton.disabled !== shouldEnable) {
      // The state isn't going to change: nothing to do.
      return;
    }

    if (
      this.#copyButtonResetTimeoutId !== null ||
      copyButton.classList.contains("copied")
    ) {
      // When the copy button's enabled state changes while it is in the "copied" state,
      // then we want to reset it immediately, instead of waiting for the timeout.
      this.#resetCopyButton();
    }

    copyButton.disabled = !shouldEnable;

    const eventName = shouldEnable
      ? "AboutTranslationsTest:CopyButtonEnabled"
      : "AboutTranslationsTest:CopyButtonDisabled";
    document.dispatchEvent(new CustomEvent(eventName));
  }

  /**
   * Applies the "copied" state visuals to the copy button.
   */
  #showCopyButtonCopiedState() {
    const { copyButton } = this.elements;

    if (this.#copyButtonResetTimeoutId !== null) {
      // If there was a previously set timeout id, then we need to clear it to restart the timer.
      // This occurs when the button is clicked a subsequent time when it is already in the "copied" state.
      window.clearTimeout(this.#copyButtonResetTimeoutId);
      this.#copyButtonResetTimeoutId = null;
    }

    copyButton.classList.add("copied");
    copyButton.iconSrc = "chrome://global/skin/icons/check.svg";

    document.l10n.setAttributes(
      copyButton,
      "about-translations-copy-button-copied"
    );
    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:CopyButtonShowCopied")
    );

    if (!window.testManualCopyButtonReset) {
      this.#copyButtonResetTimeoutId = window.setTimeout(() => {
        this.#resetCopyButton();
      }, window.COPY_BUTTON_RESET_DELAY);
    }
  }

  /**
   * Restores the copy button to its default visual state.
   */
  #resetCopyButton() {
    if (this.#copyButtonResetTimeoutId !== null) {
      window.clearTimeout(this.#copyButtonResetTimeoutId);
      this.#copyButtonResetTimeoutId = null;
    }

    const { copyButton } = this.elements;
    if (!copyButton.classList.contains("copied")) {
      return;
    }

    copyButton.classList.remove("copied");
    copyButton.iconSrc = "chrome://global/skin/icons/edit-copy.svg";

    document.l10n.setAttributes(
      copyButton,
      "about-translations-copy-button-default"
    );
    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:CopyButtonReset")
    );
  }

  /**
   * Manually resets the state of the copy button.
   * This function is only expected to be called by automated tests.
   */
  testResetCopyButton() {
    if (!AT_isInAutomation()) {
      throw new Error("Test-only function called outside of automation.");
    }

    if (!window.testManualCopyButtonReset) {
      throw new Error("Unexpected call to testResetCopyButton.");
    }

    this.#resetCopyButton();
  }

  /**
   * If the currently selected language pair is determined to be swappable,
   * swaps the active source language with the active target language,
   * and moves the translated output to be the new source text.
   */
  #maybeSwapLanguages() {
    if (!this.#selectedLanguagePairIsSwappable()) {
      return;
    }

    const {
      sourceLanguageSelector,
      targetLanguageSelector,
      sourceSectionTextArea,
      targetSectionTextArea,
    } = this.elements;

    const selectedLanguagePair = this.#getSelectedLanguagePair();

    sourceLanguageSelector.value = selectedLanguagePair.targetLanguage;
    targetLanguageSelector.value = selectedLanguagePair.sourceLanguage;
    sourceSectionTextArea.value = targetSectionTextArea.value;

    this.#updateSourceScriptDirection();
    this.#updateTargetScriptDirection();
    this.#requestSectionHeightsUpdate({ scheduleCallback: false });
    this.#updateSourceSectionClearButtonVisibility();

    if (sourceSectionTextArea.value) {
      this.#displayTranslatingPlaceholder();
    }

    // When swapping languages, the target language will become the source language,
    // therefore the "detect" option is guaranteed to not be selected, and we need
    // to ensure that we reset the option text back to the default in case the user
    // opens the source-text dropdown menu.
    this.#resetDetectLanguageOptionText();
  }

  /**
   * Attempts to identify the BCP-47 language tag of the source text.
   * Returns an empty string if no language could be identified.
   *
   * @returns {string} The BCP-47 language tag of the identified language.
   */
  async #identifySourceLanguage() {
    const sourceText = this.#getSourceText();
    if (!sourceText) {
      return "";
    }

    const { language, confident } = await AT_identifyLanguage(sourceText);
    if (!confident) {
      return "";
    }

    if (language === "zh") {
      // CLD2 detects simplified Chinese as "zh" and traditional Chinese as "zh-Hant".
      // But we need to be explicit about the script tag in both cases.
      return "zh-Hans";
    }

    return language;
  }

  /**
   * Returns the trimmed value of the source <textarea>.
   *
   * @returns {string}
   */
  #getSourceText() {
    return this.elements.sourceSectionTextArea.value.trim();
  }

  /**
   * Returns true if the source textarea contains any text, otherwise false.
   *
   * @returns {boolean}
   */
  #sourceTextAreaHasValue() {
    return Boolean(this.elements.sourceSectionTextArea.value);
  }

  /**
   * Shows or hides the source clear button based on whether the textarea has text.
   */
  #updateSourceSectionClearButtonVisibility() {
    const { sourceSectionClearButton } = this.elements;

    const shouldShow = this.#sourceTextAreaHasValue();
    const isHidden = sourceSectionClearButton.hidden;

    const shouldHide = !shouldShow;
    const isShown = !isHidden;

    if (shouldShow && isHidden) {
      sourceSectionClearButton.hidden = false;
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:SourceTextClearButtonShown")
      );
    } else if (shouldHide && isShown) {
      sourceSectionClearButton.hidden = true;
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:SourceTextClearButtonHidden")
      );
    }
  }

  /**
   * Sets the value of the source <textarea> and dispatches an input event.
   *
   * @param {string} value
   */
  #setSourceText(value) {
    const { sourceSectionTextArea } = this.elements;
    const hadValueBefore = Boolean(sourceSectionTextArea.value);

    sourceSectionTextArea.value = value;
    sourceSectionTextArea.dispatchEvent(new Event("input"));

    this.#maybeUpdateDetectedSourceLanguage();
    this.#updateSourceScriptDirection();
    this.#requestSectionHeightsUpdate({ scheduleCallback: false });

    if (!value && hadValueBefore) {
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:ClearSourceText")
      );
    }
  }

  /**
   * Sets the value of the target <textarea>.
   *
   * @param {string} value
   * @param {object} [options]
   * @param {boolean} [options.isTranslationResult=false]
   * True if the value is the result of a translation request, otherwise false.
   */
  #setTargetText(value, { isTranslationResult = false } = {}) {
    this.elements.targetSectionTextArea.value = value;

    if (!value) {
      document.dispatchEvent(
        new CustomEvent("AboutTranslationsTest:ClearTargetText")
      );
    }

    this.#updateTargetScriptDirection();
    this.#requestSectionHeightsUpdate({ scheduleCallback: false });
    this.#setCopyButtonEnabled(Boolean(value) && isTranslationResult);
  }

  /**
   * Displays the translating placeholder text if the conditions are correct to do so.
   * We do this when switching to a new language pair, when rebuilding the translator,
   * or if the text is long enough that translating may incur a significant wait time.
   */
  #maybeDisplayTranslatingPlaceholder() {
    const sourceText = this.#getSourceText();

    if (
      // We will need to request a new translator, which will take time.
      !this.#translatorMatchesSelectedLanguagePair() ||
      // The current translator matches, but we need to request a new port, which takes time.
      this.#translator?.portClosed ||
      // The source text is long enough to take noticeable time to translate,
      // and has changed enough from the previous source text to warrant a placeholder.
      (sourceText.length > 5000 &&
        Math.abs(sourceText.length - this.#previousSourceText.length) > 500)
    ) {
      this.#displayTranslatingPlaceholder();
    }

    this.#previousSourceText = sourceText;
  }

  /**
   * Shows the translating placeholder in the target textarea and disables
   * the swap-languages button while translation is in progress.
   */
  #displayTranslatingPlaceholder() {
    const { targetSectionTextArea } = this.elements;

    this.#setTargetText(this.#translatingPlaceholderText);
    this.#disableSwapLanguagesButton();

    targetSectionTextArea.setAttribute(
      "dir",
      AT_getScriptDirection(AT_getAppLocale())
    );

    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:ShowTranslatingPlaceholder")
    );
  }

  /**
   * Returns true if the current {@link Translator} instance is sufficient
   * to translate the actively selected language pair, otherwise false.
   *
   * @returns {boolean}
   */
  #translatorMatchesSelectedLanguagePair() {
    if (!this.#translator) {
      // There is no active translator, therefore the language pair cannot match it.
      return false;
    }

    const selectedLanguagePair = this.#getSelectedLanguagePair();
    if (!selectedLanguagePair) {
      // No valid language pair is selected, therefore it cannot match the translator.
      return false;
    }

    return this.#translator.matchesLanguagePair(selectedLanguagePair);
  }

  /**
   * Sets the initial focus on the most appropriate UI element based on the context.
   */
  #setInitialFocus() {
    const { targetLanguageSelector, sourceSectionTextArea } = this.elements;

    if (targetLanguageSelector.value === "") {
      targetLanguageSelector.focus();
    } else {
      sourceSectionTextArea.focus();
    }
  }

  /**
   * Reads the current URL hash and updates the UI to reflect the parameters.
   * Invalid parameters are ignored.
   */
  async #updateUIFromURL() {
    const supportedLanguages = this.#supportedLanguages;
    const urlParams = new URLSearchParams(window.location.href.split("#")[1]);
    const sourceLanguage = urlParams.get("src");
    const targetLanguage = urlParams.get("trg");
    const sourceText = urlParams.get("text") ?? "";
    const { sourceLanguageSelector, targetLanguageSelector } = this.elements;

    if (sourceLanguage === "detect") {
      await this.#maybeUpdateDetectedSourceLanguage();
    } else if (
      supportedLanguages.sourceLanguages.some(
        ({ langTagKey }) => langTagKey === sourceLanguage
      )
    ) {
      sourceLanguageSelector.value = sourceLanguage;
    }

    if (
      supportedLanguages.targetLanguages.some(
        ({ langTagKey }) => langTagKey === targetLanguage
      )
    ) {
      targetLanguageSelector.value = targetLanguage;
    }

    this.#setSourceText(sourceText);
  }

  /**
   * Updates the URL hash to reflect the current state of the UI.
   */
  #updateURLFromUI() {
    const { sourceLanguageSelector, targetLanguageSelector } = this.elements;

    const params = new URLSearchParams();

    const sourceLanguage = sourceLanguageSelector.value;
    if (sourceLanguage) {
      params.append("src", sourceLanguage);
    }

    const targetLanguage = targetLanguageSelector.value;
    if (targetLanguage) {
      params.append("trg", targetLanguage);
    }

    const sourceText = this.#getSourceText().substring(0, URL_MAX_TEXT_LENGTH);
    if (sourceText) {
      params.append("text", sourceText);
    }

    window.location.hash = params;

    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:URLUpdatedFromUI", {
        detail: { sourceLanguage, targetLanguage, sourceText },
      })
    );
  }

  /**
   * Sets the text direction ("dir" attribute) of the source text area
   * based on its content and the currently selected source language.
   */
  #updateSourceScriptDirection() {
    const appLocale = AT_getAppLocale();
    const selectedLanguagePair = this.#getSelectedLanguagePair();
    const selectedSourceLanguage = selectedLanguagePair?.sourceLanguage;
    const { sourceSectionTextArea } = this.elements;

    if (selectedSourceLanguage && sourceSectionTextArea.value) {
      sourceSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(selectedSourceLanguage)
      );
    } else {
      sourceSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(appLocale)
      );
    }
  }

  /**
   * Sets the text direction ("dir" attribute) of the target text area
   * based on its content and the currently selected target language.
   */
  #updateTargetScriptDirection() {
    const appLocale = AT_getAppLocale();
    const selectedLanguagePair = this.#getSelectedLanguagePair();
    const selectedTargetLanguage = selectedLanguagePair?.targetLanguage;
    const { targetSectionTextArea } = this.elements;

    if (selectedTargetLanguage && targetSectionTextArea.value) {
      targetSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(selectedTargetLanguage)
      );
    } else {
      targetSectionTextArea.setAttribute(
        "dir",
        AT_getScriptDirection(appLocale)
      );
    }
  }

  /**
   * Ensures that the translator matches the selected language pair,
   * destroying the previous non-matching translator if needed, and
   * creating a new translator.
   *
   * @returns {Promise<boolean>} true if the translator was reassigned, otherwise false.
   */
  async #ensureTranslatorMatchesSelectedLanguagePair() {
    if (this.#translatorMatchesSelectedLanguagePair()) {
      return false;
    }

    this.#translator?.destroy();

    const selectedLanguagePair = this.#getSelectedLanguagePair();

    this.#translator = await Translator.create({
      languagePair: selectedLanguagePair,
      requestTranslationsPort,
      allowSameLanguage: true,
      activeRequestCapacity: 1,
    });

    return true;
  }

  /**
   * Destroys the active {@link Translator} instance, if any.
   */
  #destroyTranslator() {
    if (this.#translator) {
      this.#translator.destroy();
      this.#translator = null;
    }
  }

  /**
   * Rebuilds the translator unconditionally and immediately re-evaluates whether
   * a translation request should be made.
   */
  rebuildTranslator() {
    this.#destroyTranslator();
    this.#maybeRequestTranslation();
  }

  /**
   * Requests translation on a debounce timer, only if the UI conditions are correct to do so.
   */
  #maybeRequestTranslation = debounce({
    /**
     * Debounce the translation requests so that the worker doesn't fire for every
     * single keyboard input, but instead the keyboard events are ignored until
     * there is a short break, or enough events have happened that it's worth sending
     * in a new translation request.
     */
    onDebounce: async () => {
      if (!this.#isFeatureEnabled) {
        return;
      }

      try {
        this.#updateURLFromUI();

        this.#requestSectionHeightsUpdate({ scheduleCallback: false });

        await this.#maybeUpdateDetectedSourceLanguage();

        const sourceText = this.#getSourceText();
        const selectedLanguagePair = this.#getSelectedLanguagePair();

        if (!sourceText || !selectedLanguagePair) {
          // The conditions for translation are not met.
          this.#setTargetText("");
          this.#destroyTranslator();
          this.#updateSwapLanguagesButtonEnabledState();
          this.elements.targetSectionTextArea.setAttribute(
            "dir",
            AT_getScriptDirection(AT_getAppLocale())
          );
          return;
        }

        if (this.#isDetectedLanguageUnsupported()) {
          this.#updateSwapLanguagesButtonEnabledState();
          this.#setTargetText("");
          return;
        }

        const translationId = ++this.#translationId;
        this.#maybeDisplayTranslatingPlaceholder();

        await this.#ensureTranslatorMatchesSelectedLanguagePair();
        if (translationId !== this.#translationId) {
          // This translation request is no longer relevant.
          return;
        }

        document.dispatchEvent(
          new CustomEvent("AboutTranslationsTest:TranslationRequested", {
            detail: { translationId },
          })
        );

        const startTime = performance.now();
        const translationRequest = this.#translator.translate(
          sourceText,
          AT_isHtmlTranslation()
        );

        const translatedText = await translationRequest;
        if (translationId !== this.#translationId) {
          // This translation request is no longer relevant.
          return;
        }

        performance.measure(
          `AboutTranslations: Translate ${selectedLanguagePair.sourceLanguage} → ${selectedLanguagePair.targetLanguage} with ${sourceText.length} characters.`,
          {
            start: startTime,
            end: performance.now(),
          }
        );

        this.#setTargetText(translatedText, { isTranslationResult: true });
        this.#updateSwapLanguagesButtonEnabledState();
        document.dispatchEvent(
          new CustomEvent("AboutTranslationsTest:TranslationComplete", {
            detail: { translationId },
          })
        );

        const duration = performance.now() - startTime;
        AT_log(`Translation done in ${duration / 1000} seconds`);
      } catch (error) {
        AT_logError(error);
      }
    },

    // Mark the events so that they show up in the Firefox Profiler. This makes it handy
    // to visualize the debouncing behavior.
    doEveryTime: () => {
      if (!this.#isFeatureEnabled) {
        return;
      }

      const sourceText = this.#getSourceText();
      performance.mark(
        `Translations: input changed to ${sourceText.length} code units.`
      );

      if (!sourceText) {
        this.#setTargetText("");
      }

      this.#updateSourceScriptDirection();
    },
  });

  /**
   * Requests that the heights of each section is updated to at least match its content.
   *
   * In horizontal orientation the source and target sections are synchronized to
   * the maximum content height between the two. In vertical orientation, each section
   * is sized to its own content height.
   *
   * There are many situations in which this function needs to be called:
   *   - Every time the source text is updated
   *   - Every time a translation occurs
   *   - Every time the window is resized
   *   - Every time the zoom level is changed
   *   - Etc.
   *
   * Some of these events happen infrequently, or are already debounced, such as
   * each time a translation occurs. In these situations it is okay to update
   * the section heights immediately.
   *
   * Some of these events can trigger quite rapidly, such as resizing the window
   * via click-and-drag semantics. In this case, a single callback should be scheduled
   * to update the section heights to prevent unnecessary and excessive reflow.
   *
   * @param {object} params
   * @param {boolean} params.scheduleCallback
   */
  #requestSectionHeightsUpdate({ scheduleCallback }) {
    if (scheduleCallback) {
      if (this.#updateSectionHeightsTimeoutId) {
        // There is already a pending callback: no need to schedule another.
        return;
      }

      this.#updateSectionHeightsTimeoutId = setTimeout(
        this.#updateSectionHeights,
        100
      );

      return;
    }

    this.#updateSectionHeights();
  }

  /**
   * Updates the section heights based on the current page orientation.
   *
   * This function is intentionally written as a lambda so that it can be passed
   * as a callback without the need to explicitly bind `this` to the function object.
   */
  #updateSectionHeights = () => {
    if (this.#updateSectionHeightsTimeoutId) {
      clearTimeout(this.#updateSectionHeightsTimeoutId);
      this.#updateSectionHeightsTimeoutId = null;
    }

    if (this.#pageOrientation === "horizontal") {
      this.#synchronizeSectionsToMaxContentHeight();
    } else {
      this.#resizeSectionsToIndividualContentHeights();
    }
  };

  /**
   * Retrieves the combined border and padding height of an element.
   *
   * Returns 0 when the element is missing or does not use border-box sizing.
   *
   * @param {HTMLElement | undefined} element
   *
   * @returns {number}
   */
  #getBorderAndPaddingHeight(element) {
    if (!element) {
      return 0;
    }

    const style = window.getComputedStyle(element);
    if (style.boxSizing !== "border-box") {
      return 0;
    }

    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

    return Math.ceil(borderTop + borderBottom + paddingTop + paddingBottom);
  }

  /**
   * Retrieves the minimum height of an element.
   *
   * @param {HTMLElement | undefined} element
   *
   * @returns {number}
   */
  #getMinHeight(element) {
    if (!element) {
      return 0;
    }

    const style = window.getComputedStyle(element);
    const minHeight = Number.parseFloat(style.minHeight);

    if (Number.isNaN(minHeight)) {
      return 0;
    }

    return Math.max(minHeight - this.#getBorderAndPaddingHeight(element), 0);
  }

  /**
   * Returns whether a section height increased or decreased.
   *
   * @param {number} beforeHeight
   * @param {number} afterHeight
   * @returns {null | "decreased" | "increased"}
   */
  #getSectionHeightChange(beforeHeight, afterHeight) {
    const changeThreshold = 1;
    if (!Number.isFinite(beforeHeight) || beforeHeight <= changeThreshold) {
      return null;
    }

    const delta = afterHeight - beforeHeight;
    if (Math.abs(delta) <= changeThreshold) {
      return null;
    }

    return delta < 0 ? "decreased" : "increased";
  }

  /**
   * Dispatches a test event when section height changes are detected.
   *
   * @param {object} params
   * @param {null | "decreased" | "increased"} params.sourceSectionHeightChange
   * @param {null | "decreased" | "increased"} params.targetSectionHeightChange
   */
  #dispatchSectionHeightsChangedEvent({
    sourceSectionHeightChange,
    targetSectionHeightChange,
  }) {
    if (!sourceSectionHeightChange && !targetSectionHeightChange) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:SectionHeightsChanged", {
        detail: {
          sourceSectionHeightChange: sourceSectionHeightChange ?? "unchanged",
          targetSectionHeightChange: targetSectionHeightChange ?? "unchanged",
        },
      })
    );
  }

  /**
   * Calculates the content heights in both the source and target sections,
   * then syncs them to the maximum calculated content height among the two.
   *
   * Prefer calling #requestSectionHeightsUpdate to make it clear whether this function
   * needs to run immediately, or is okay to be scheduled as a callback.
   *
   * @see {AboutTranslations#requestSectionHeightsUpdate}
   */
  #synchronizeSectionsToMaxContentHeight() {
    const {
      sourceSection,
      sourceSectionTextArea,
      targetSection,
      targetSectionActionsRow,
      targetSectionTextArea,
    } = this.elements;

    const sourceSectionHeightBefore = Number.parseFloat(
      sourceSection?.style.height
    );
    const targetSectionHeightBefore = Number.parseFloat(
      targetSection?.style.height
    );

    sourceSection.style.height = "auto";
    targetSection.style.height = "auto";
    sourceSectionTextArea.style.height = "auto";
    targetSectionTextArea.style.height = "auto";

    const targetActionsHeight =
      targetSectionActionsRow.getBoundingClientRect().height;
    const minSectionHeight = AboutTranslations.#maxInteger(
      this.#getMinHeight(sourceSection),
      this.#getMinHeight(targetSection)
    );
    const targetSectionContentHeight =
      targetSectionTextArea.scrollHeight + targetActionsHeight;
    const maxContentHeight = AboutTranslations.#maxInteger(
      sourceSectionTextArea.scrollHeight,
      targetSectionContentHeight,
      minSectionHeight
    );
    const sectionBorderHeight = AboutTranslations.#maxInteger(
      this.#getBorderAndPaddingHeight(sourceSection),
      this.#getBorderAndPaddingHeight(targetSection)
    );
    const maxSectionHeight = maxContentHeight + sectionBorderHeight;
    const maxSectionHeightPixels = `${maxSectionHeight}px`;
    const targetSectionTextAreaHeightPixels = `${Math.max(
      maxContentHeight - targetActionsHeight,
      0
    )}px`;
    const sourceSectionHeightChange = this.#getSectionHeightChange(
      sourceSectionHeightBefore,
      maxSectionHeight
    );
    const targetSectionHeightChange = this.#getSectionHeightChange(
      targetSectionHeightBefore,
      maxSectionHeight
    );

    sourceSection.style.height = maxSectionHeightPixels;
    targetSection.style.height = maxSectionHeightPixels;

    sourceSectionTextArea.style.height = "100%";
    targetSectionTextArea.style.height = targetSectionTextAreaHeightPixels;

    this.#dispatchSectionHeightsChangedEvent({
      sourceSectionHeightChange,
      targetSectionHeightChange,
    });
  }

  /**
   * Calculates the content heights in both the source and target sections,
   * then sizes each section to its own calculated content height.
   *
   * Prefer calling #requestSectionHeightsUpdate to make it clear whether this function
   * needs to run immediately, or is okay to be scheduled as a callback.
   *
   * @see {AboutTranslations#requestSectionHeightsUpdate}
   */
  #resizeSectionsToIndividualContentHeights() {
    const {
      sourceSection,
      sourceSectionTextArea,
      targetSection,
      targetSectionActionsRow,
      targetSectionTextArea,
    } = this.elements;

    const sourceSectionHeightBefore = Number.parseFloat(
      sourceSection?.style.height
    );
    const targetSectionHeightBefore = Number.parseFloat(
      targetSection?.style.height
    );

    sourceSection.style.height = "auto";
    targetSection.style.height = "auto";
    sourceSectionTextArea.style.height = "auto";
    targetSectionTextArea.style.height = "auto";

    const targetActionsHeight =
      targetSectionActionsRow.getBoundingClientRect().height;
    const sourceMinHeight = this.#getMinHeight(sourceSection);
    const targetMinHeight = this.#getMinHeight(targetSection);
    const sourceContentHeight = AboutTranslations.#maxInteger(
      sourceSectionTextArea.scrollHeight,
      sourceMinHeight
    );
    const targetContentHeight = AboutTranslations.#maxInteger(
      targetSectionTextArea.scrollHeight + targetActionsHeight,
      targetMinHeight
    );
    const sourceSectionHeight =
      sourceContentHeight + this.#getBorderAndPaddingHeight(sourceSection);
    const targetSectionHeight =
      targetContentHeight + this.#getBorderAndPaddingHeight(targetSection);
    const targetSectionTextAreaHeightPixels = `${Math.max(
      targetContentHeight - targetActionsHeight,
      0
    )}px`;
    const sourceSectionHeightChange = this.#getSectionHeightChange(
      sourceSectionHeightBefore,
      sourceSectionHeight
    );
    const targetSectionHeightChange = this.#getSectionHeightChange(
      targetSectionHeightBefore,
      targetSectionHeight
    );

    sourceSection.style.height = `${sourceSectionHeight}px`;
    targetSection.style.height = `${targetSectionHeight}px`;
    sourceSectionTextArea.style.height = "100%";
    targetSectionTextArea.style.height = targetSectionTextAreaHeightPixels;

    this.#dispatchSectionHeightsChangedEvent({
      sourceSectionHeightChange,
      targetSectionHeightChange,
    });
  }
}

/**
 * A promise used to ensure the about:translations page initializes once.
 *
 * @type {Promise<void> | null}
 */
let aboutTranslationsInitPromise = null;

/**
 * Initializes the about:translations page if it has not been initialized yet.
 *
 * @returns {Promise<void>}
 */
async function ensureAboutTranslationsInitialized() {
  if (aboutTranslationsInitPromise) {
    return aboutTranslationsInitPromise;
  }

  aboutTranslationsInitPromise = AT_isTranslationEngineSupported()
    .then(async isTranslationsEngineSupported => {
      window.aboutTranslations = new AboutTranslations(
        isTranslationsEngineSupported
      );
      await window.aboutTranslations.ready();
    })
    .catch(error => {
      AT_logError(error);
    });

  return aboutTranslationsInitPromise;
}

/**
 * Marks that the document is ready for automated testing to being making assertions.
 *
 * @returns {void}
 */
function markReadyForTesting() {
  document.body.setAttribute("ready-for-testing", "");
}

/**
 * Whether the initial enabled state has been applied.
 *
 * @type {boolean}
 */
let initialEnabledStateApplied = false;

/**
 * Applies the enabled state to the about:translations UI.
 *
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
async function setFeatureEnabledState(enabled) {
  await ensureAboutTranslationsInitialized();

  if (!window.aboutTranslations) {
    return;
  }

  if (enabled) {
    await window.aboutTranslations.onFeatureEnabled();
  } else {
    window.aboutTranslations.onFeatureDisabled();
  }

  if (initialEnabledStateApplied) {
    document.dispatchEvent(
      new CustomEvent("AboutTranslationsTest:EnabledStateChanged", {
        detail: { enabled },
      })
    );
  }

  initialEnabledStateApplied = true;
  markReadyForTesting();
}

/**
 * Listen for events coming from the AboutTranslations actor.
 */
window.addEventListener("AboutTranslationsChromeToContent", ({ detail }) => {
  switch (detail.type) {
    case "enabled-state-changed": {
      void setFeatureEnabledState(detail.enabled);
      break;
    }
    case "rebuild-translator": {
      window.aboutTranslations?.rebuildTranslator();
      break;
    }
    default: {
      throw new Error("Unknown AboutTranslationsChromeToContent event.");
    }
  }
});

/**
 * Creates a new message port to handle translation requests for the given
 * language pair.
 *
 * @param {LanguagePair} languagePair
 * @returns {Promise<MessagePort>}
 */
function requestTranslationsPort(languagePair) {
  const { promise, resolve } = Promise.withResolvers();

  /** @param {{data: {type:string, languagePair: LanguagePair, port: MessagePort}}} */
  const getResponse = ({ data }) => {
    if (
      data.type == "GetTranslationsPort" &&
      data.languagePair.sourceLanguage === languagePair.sourceLanguage &&
      data.languagePair.targetLanguage === languagePair.targetLanguage &&
      data.languagePair.sourceVariant == languagePair.sourceVariant &&
      data.languagePair.targetVariant == languagePair.targetVariant
    ) {
      window.removeEventListener("message", getResponse);
      resolve(data.port);
    }
  };

  window.addEventListener("message", getResponse);
  AT_createTranslationsPort(languagePair);

  return promise;
}

/**
 * Debounce a function so that it is only called after some wait time with no activity.
 * This is good for grouping text entry via keyboard.
 *
 * @param {object} settings
 * @param {Function} settings.onDebounce
 * @param {Function} settings.doEveryTime
 * @returns {Function}
 */
function debounce({ onDebounce, doEveryTime }) {
  /** @type {number | null} */
  let timeoutId = null;
  let lastDispatch = null;

  return (...args) => {
    doEveryTime(...args);

    const now = Date.now();
    if (lastDispatch === null) {
      // This is the first call to the function.
      lastDispatch = now;
    }

    const timeLeft = lastDispatch + window.DEBOUNCE_DELAY - now;

    // Always discard the old timeout, either the function will run, or a new
    // timer will be scheduled.
    clearTimeout(timeoutId);

    if (timeLeft <= 0) {
      // It's been long enough to go ahead and call the function.
      timeoutId = null;
      lastDispatch = null;
      onDebounce(...args);
      return;
    }

    // Re-set the timeout with the current time left.
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      // Timeout ended, call the function.
      timeoutId = null;
      lastDispatch = null;
      onDebounce(...args);
    }, timeLeft);
  };
}
