/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const languagePairs = [
  // Bidirectional language pairs.
  { fromLang: "en", toLang: "de" },
  { fromLang: "de", toLang: "de" },
  { fromLang: "en", toLang: "es" },
  { fromLang: "es", toLang: "en" },
  { fromLang: "en", toLang: "fr" },
  { fromLang: "fr", toLang: "en" },
  // Single-direction language pairs.
  { fromLang: "en", toLang: "ja" },
  { fromLang: "ko", toLang: "en" },
];

/**
 * This test case ensures that the src parameter updates as expected.
 */
add_task(async function test_about_translations_url_src_param_updates() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: true,
  });

  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "detect",
    targetLanguage: "",
    sourceText: "",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          { sourceLanguage: "ko", targetLanguage: "", sourceText: "" },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("ko");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "ko",
    targetLanguage: "",
    sourceText: "",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          { sourceLanguage: "ko", targetLanguage: "ja", sourceText: "" },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "ko",
    targetLanguage: "ja",
    sourceText: "",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "ko",
            targetLanguage: "ja",
            sourceText: "Hello world",
          },
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
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "ko",
    targetLanguage: "ja",
    sourceText: "Hello world",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "ko",
    targetLanguage: "ja",
    sourceText: "Hello world",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
          { language: "en" },
        ],
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "detect",
            targetLanguage: "ja",
            sourceText: "Hello world",
          },
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
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "detect",
    targetLanguage: "ja",
    sourceText: "Hello world",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    detectedLanguage: "en",
    targetLanguage: "ja",
    sourceText: "Hello world",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "detect",
            targetLanguage: "",
            sourceText: "Hello world",
          },
        ],
        [AboutTranslationsTestUtils.Events.ClearTargetText],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
        AboutTranslationsTestUtils.Events.TranslationRequested,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "detect",
    targetLanguage: "",
    sourceText: "Hello world",
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    showsPlaceholder: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "detect",
            targetLanguage: "",
            sourceText: "",
          },
        ],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("");
    }
  );
  await aboutTranslationsTestUtils.assertURLMatchesUI({
    sourceLanguage: "detect",
    targetLanguage: "",
    sourceText: "",
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  await cleanup();
});
