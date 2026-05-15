/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case ensures that the swap-languages button is enabled and disabled when
 * explicitly selecting languages.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_explicit_bidirectional_detected_languages() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },
          { fromLang: "en", toLang: "zh-Hans" },
          { fromLang: "zh-Hans", toLang: "en" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "en" },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue(
          "zh-Hans"
        );
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "zh-Hans",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      showsPlaceholder: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 2 },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
          AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue(
          "zh-Hans"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "zh-Hans",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.ClearTargetText,
          AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "en" },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 3 },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 3 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
          AboutTranslationsTestUtils.Events.ClearTargetText,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue(
          "detect"
        );
      }
    );

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button is disabled
 * whenever the same language is selected.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_same_detected_language() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "ja" },
          { fromLang: "ja", toLang: "en" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "en" },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "ja",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 2 },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "en",
      sourceText: "Hello world",
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button is disabled
 * when selecting language pairs available in only one direction.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_single_direction_detected_languages() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "ja" },
          { fromLang: "ja", toLang: "en" },
          { fromLang: "es", toLang: "en" },
          { fromLang: "en", toLang: "ko" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "es" },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          "Hola mundo, ¿cómo estás?"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "es",
      targetLanguage: "ja",
      sourceText: "Hola mundo, ¿cómo estás?",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "en" },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "ja",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 3 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 3 },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ko");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "ko",
      sourceText: "Hello world",
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button behaves correctly when clicked.
 */
add_task(
  async function test_about_translations_swap_languages_button_click_with_detected_language_translation() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "ja" },
          { fromLang: "ja", toLang: "en" },
        ],
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "en" },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      detectedLanguage: "en",
      targetLanguage: "ja",
      sourceText: "Hello world",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 2 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.DetectedLanguageUpdated],
      },
      async () => {
        await aboutTranslationsTestUtils.clickSwapLanguagesButton();
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "ja",
      targetLanguage: "en",
      sourceText: "HELLO WORLD [en to ja]",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 3 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 3 },
          ],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.DetectedLanguageUpdated],
      },
      async () => {
        await aboutTranslationsTestUtils.clickSwapLanguagesButton();
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "en",
      targetLanguage: "ja",
      sourceText: "HELLO WORLD [EN TO JA] [ja to en]",
    });

    await cleanup();
  }
);
