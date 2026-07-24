/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case ensures that the swap-languages button is enabled and disabled when
 * explicitly selecting languages.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_explicit_bidirectional_languages() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },
          { fromLang: "en", toLang: "zh-Hans" },
          { fromLang: "zh-Hans", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue(
          "zh-Hans"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
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

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
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

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue(
          "detect"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("es");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button is disabled
 * whenever the same language is selected.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_same_language() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "ja" },
          { fromLang: "ja", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
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

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button is disabled
 * when selecting language pairs available in only one direction.
 */
add_task(
  async function test_about_translations_swap_languages_button_with_single_direction_languages() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },
          { fromLang: "ja", toLang: "en" },
          { fromLang: "en", toLang: "ko" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("es");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        ],
        unexpected: [
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

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("es");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button behaves correctly when clicked
 * without text to translate.
 */
add_task(
  async function test_about_translations_swap_languages_button_click_no_translation() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "ja" },
          { fromLang: "ja", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "en",
    });
    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "ja",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.clickSwapLanguagesButton();
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "ja",
    });
    await aboutTranslationsTestUtils.assertTargetLanguageSelector({
      value: "en",
    });

    await cleanup();
  }
);

/**
 * This test case ensures that the swap-languages button behaves correctly when clicked
 * with text to translate.
 */
add_task(
  async function test_about_translations_swap_languages_button_click_with_translation() {
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
          [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
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
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertSwapLanguagesButton({
      enabled: true,
    });
    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "en",
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

    await cleanup();
  }
);
