/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const AI_PREFS = [
  ["browser.translations.enable", false],
  ["browser.ai.control.default", "blocked"],
  ["browser.ai.control.translations", "blocked"],
];

const HIDDEN_UI = {
  pageHeader: false,
  mainUserInterface: false,
  sourceLanguageSelector: false,
  targetLanguageSelector: false,
  copyButton: false,
  swapLanguagesButton: false,
  sourceSectionTextArea: false,
  targetSectionTextArea: false,
  unsupportedInfoMessage: false,
  languageLoadErrorMessage: false,
};

const VISIBLE_UI = {
  pageHeader: true,
  mainUserInterface: true,
  sourceLanguageSelector: true,
  targetLanguageSelector: true,
  copyButton: true,
  swapLanguagesButton: true,
  sourceSectionTextArea: true,
  targetSectionTextArea: true,
  unsupportedInfoMessage: false,
  languageLoadErrorMessage: false,
};

/**
 * Checks the about:translations UI updates with AIFeature enable/disable starting from disabled.
 */
add_task(
  async function test_about_translations_ai_feature_toggle_from_disabled() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        disabled: true,
        autoDownloadFromRemoteSettings: true,
        prefs: [
          ["browser.translations.enable", false],
          ["browser.ai.control.default", "blocked"],
          ["browser.ai.control.translations", "blocked"],
        ],
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible(HIDDEN_UI);

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.EnabledStateChanged,
            { enabled: true },
          ],
        ],
      },
      async () => {
        await TranslationsParent.AIFeature.enable();
      }
    );
    await aboutTranslationsTestUtils.assertIsVisible(VISIBLE_UI);

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.EnabledStateChanged,
            { enabled: false },
          ],
        ],
      },
      async () => {
        await TranslationsParent.AIFeature.disable();
      }
    );
    await aboutTranslationsTestUtils.assertIsVisible(HIDDEN_UI);

    await cleanup();
  }
);

/**
 * Checks the about:translations UI updates with AIFeature disable/enable starting from enabled.
 */
add_task(
  async function test_about_translations_ai_feature_toggle_from_enabled() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        disabled: false,
        autoDownloadFromRemoteSettings: true,
        prefs: [
          ["browser.translations.enable", true],
          ["browser.ai.control.default", "available"],
          ["browser.ai.control.translations", "default"],
        ],
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible(VISIBLE_UI);

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.EnabledStateChanged,
            { enabled: false },
          ],
        ],
      },
      async () => {
        await TranslationsParent.AIFeature.disable();
      }
    );
    await aboutTranslationsTestUtils.assertIsVisible(HIDDEN_UI);

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.EnabledStateChanged,
            { enabled: true },
          ],
        ],
      },
      async () => {
        await TranslationsParent.AIFeature.enable();
      }
    );
    await aboutTranslationsTestUtils.assertIsVisible(VISIBLE_UI);

    await cleanup();
  }
);

/**
 * Checks that the page loads correctly when the global Translations pref is enabled.
 */
add_task(async function test_about_translations_engine_unsupported() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    autoDownloadFromRemoteSettings: true,
    prefs: [["browser.translations.simulateUnsupportedEngine", true]],
  });

  await aboutTranslationsTestUtils.assertIsVisible({
    pageHeader: true,
    unsupportedInfoMessage: true,
    mainUserInterface: false,
    sourceLanguageSelector: false,
    targetLanguageSelector: false,
    copyButton: false,
    swapLanguagesButton: false,
    sourceSectionTextArea: false,
    targetSectionTextArea: false,
    languageLoadErrorMessage: false,
  });

  await cleanup();
});
