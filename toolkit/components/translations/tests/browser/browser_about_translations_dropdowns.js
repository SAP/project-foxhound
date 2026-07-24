/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_about_translations_dropdown_initialization() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "en", toLang: "es" },
      { fromLang: "es", toLang: "en" },

      // Only translations from "is" are available.
      { fromLang: "is", toLang: "en" },

      // Only translations into "fi" are available.
      { fromLang: "en", toLang: "fi" },

      // The following languages utilize script tags.
      { fromLang: "en", toLang: "zh-Hans" },
      { fromLang: "zh-Hans", toLang: "en" },
      { fromLang: "en", toLang: "zh-Hant" },
      { fromLang: "zh-Hant", toLang: "en" },

      // The following languages utilize variant tags.
      { fromLang: "en", toLang: "es,base-memory" },
      { fromLang: "es,base-memory", toLang: "en" },
      { fromLang: "en", toLang: "zh-Hans,base" },
      { fromLang: "zh-Hans,base", toLang: "en" },
    ],
  });

  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
    options: [
      "detect",
      "zh-Hans",
      "zh-Hans,base",
      "zh-Hant",
      "en",
      "is",
      "es",
      "es,base-memory",
    ],
  });

  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
    options: [
      "",
      "zh-Hans",
      "zh-Hans,base",
      "zh-Hant",
      "en",
      "fi",
      "es",
      "es,base-memory",
    ],
  });

  await cleanup();
});

add_task(
  async function test_about_translations_dropdown_initialization_failure() {
    // Simulate a getSupportedLanguages error only for the next call.
    const realGetSupportedLanguages = TranslationsParent.getSupportedLanguages;
    TranslationsParent.getSupportedLanguages = () => {
      TranslationsParent.getSupportedLanguages = realGetSupportedLanguages;
      throw new Error("Simulating getSupportedLanguagesError()");
    };

    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible({
      pageHeader: true,
      languageLoadErrorMessage: true,
      mainUserInterface: false,
      sourceLanguageSelector: false,
      targetLanguageSelector: false,
      copyButton: false,
      swapLanguagesButton: false,
      sourceSectionTextArea: false,
      targetSectionTextArea: false,
      unsupportedInfoMessage: false,
    });

    await cleanup();
  }
);

add_task(
  async function test_about_translations_source_dropdown_detect_language_option() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },

          // Only translations from "is" are available.
          { fromLang: "is", toLang: "en" },

          // Only translations into "fi" are available.
          { fromLang: "en", toLang: "fi" },

          // The following languages utilize script tags.
          { fromLang: "en", toLang: "zh-Hans" },
          { fromLang: "zh-Hans", toLang: "en" },
          { fromLang: "en", toLang: "zh-Hant" },
          { fromLang: "zh-Hant", toLang: "en" },

          // The following languages utilize variant tags.
          { fromLang: "en", toLang: "es,base-memory" },
          { fromLang: "es,base-memory", toLang: "en" },
          { fromLang: "en", toLang: "zh-Hans,base" },
          { fromLang: "zh-Hans,base", toLang: "en" },
        ],
      }
    );

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "detect",
      options: [
        "detect",
        "zh-Hans",
        "zh-Hans,base",
        "zh-Hant",
        "en",
        "is",
        "es",
        "es,base-memory",
      ],
    });

    await aboutTranslationsTestUtils.assertDetectLanguageOption({
      isSelected: true,
      defaultValue: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "es" },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          "Hola mundo, ¿cómo estás?"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      detectedLanguage: "es",
    });

    await aboutTranslationsTestUtils.assertDetectLanguageOption({
      isSelected: true,
      defaultValue: false,
      language: "es",
    });

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("is");

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      value: "is",
    });

    await aboutTranslationsTestUtils.assertDetectLanguageOption({
      isSelected: false,
      defaultValue: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: "es" },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue(
          "detect"
        );
      }
    );

    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      detectedLanguage: "es",
    });

    await aboutTranslationsTestUtils.assertDetectLanguageOption({
      isSelected: true,
      defaultValue: false,
      language: "es",
    });

    await cleanup();
  }
);
