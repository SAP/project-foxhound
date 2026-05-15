/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const languagePairs = [
  // Bidirectional language pairs.
  { fromLang: "en", toLang: "de" },
  { fromLang: "de", toLang: "en" },
  { fromLang: "en", toLang: "es" },
  { fromLang: "es", toLang: "en" },
  { fromLang: "en", toLang: "fr" },
  { fromLang: "fr", toLang: "en" },
  // Single-direction language pairs.
  { fromLang: "en", toLang: "ja" },
  { fromLang: "ko", toLang: "en" },
];

/**
 * This test case ensures that the src parameter loads as expected.
 */
add_task(async function test_about_translations_url_load_src_param() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
  });

  info("Testing a supported bidirectional source language.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "de",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "de",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing a supported single-direction source language.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "ko",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "ko",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing a target-only language as source language.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "ja",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing an invalid language as source language.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "invalid",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  await cleanup();
});

/**
 * This test case ensures that the trg parameter loads as expected.
 */
add_task(async function test_about_translations_url_load_trg_param() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
  });

  info("Testing a supported bidirectional target language.");
  await aboutTranslationsTestUtils.loadNewPage({
    targetLanguage: "de",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "de",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing a supported single-direction target language.");
  await aboutTranslationsTestUtils.loadNewPage({
    targetLanguage: "ja",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "ja",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing a source-only language as target language.");
  await aboutTranslationsTestUtils.loadNewPage({
    targetLanguage: "ko",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  info("Testing an invalid language as target language.");
  await aboutTranslationsTestUtils.loadNewPage({
    targetLanguage: "invalid",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  await cleanup();
});

/**
 * This test case ensures that the page loads correctly when two parameters are present
 * but one of the three parameters is missing.
 */
add_task(async function test_about_translations_url_load_one_param_missing() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
  });

  info("Testing src parameter missing.");
  await aboutTranslationsTestUtils.loadNewPage({
    targetLanguage: "de",
    sourceText: "Hello world",
  });

  const translationCompletePromise = aboutTranslationsTestUtils.waitForEvent(
    AboutTranslationsTestUtils.Events.TranslationComplete
  );
  aboutTranslationsTestUtils.resolveDownloads(1);
  await translationCompletePromise;

  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "detect",
    detectedLanguage: "en",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "de",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    value: "Hello world",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    detectedLanguage: "en",
    targetLanguage: "de",
    sourceText: "Hello world",
  });

  info("Testing trg parameter missing.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "en",
    sourceText: "Hello world",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "en",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    value: "Hello world",
  });

  info("Testing text parameter missing.");
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "en",
    targetLanguage: "de",
  });
  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "en",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "de",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    showsPlaceholder: true,
  });

  await cleanup();
});

/**
 * This test case ensures that the page loads correctly when all three parameters
 * (src, trg, and text) are present.
 */
add_task(async function test_about_translations_url_load_all_params_present() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
  });

  info(
    "Testing src, trg, and text parameters all present with a non-pivot translation."
  );
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "en",
    targetLanguage: "de",
    sourceText: "Hello world",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 1 },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "en",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "de",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    value: "Hello world",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "de",
    sourceText: "Hello world",
  });

  info(
    "Testing src, trg, and text parameters all present with a pivot translation."
  );
  await aboutTranslationsTestUtils.loadNewPage({
    sourceLanguage: "es",
    targetLanguage: "ja",
    sourceText: "Hola mundo",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 1 },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(2);
    }
  );

  await aboutTranslationsTestUtils.assertSourceLanguageSelector({
    value: "es",
  });
  await aboutTranslationsTestUtils.assertTargetLanguageSelector({
    value: "ja",
  });
  await aboutTranslationsTestUtils.assertSourceTextArea({
    value: "Hola mundo",
  });
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "es",
    targetLanguage: "ja",
    sourceText: "Hola mundo",
  });

  await cleanup();
});
