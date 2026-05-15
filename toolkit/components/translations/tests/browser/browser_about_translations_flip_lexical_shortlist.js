/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that flipping the useLexicalShortlist pref creates a new translator.
 */
add_task(async function test_about_translations_flip_lexical_shortlist_pref() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [{ fromLang: "en", toLang: "fr" }],
    prefs: [["browser.translations.useLexicalShortlist", false]],
    autoDownloadFromRemoteSettings: true,
  });

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
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        "Text to translate."
      );
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    translationId: 1,
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Text to translate.",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
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
      info('Flipping "browser.translations.useLexicalShortlist" to true.');
      await waitForTranslationModelRecordsChanged(() => {
        Services.prefs.setBoolPref(
          "browser.translations.useLexicalShortlist",
          true
        );
      });
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    translationId: 2,
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Text to translate.",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
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
    },
    async () => {
      info('Flipping "browser.translations.useLexicalShortlist" to false.');
      await waitForTranslationModelRecordsChanged(() => {
        Services.prefs.setBoolPref(
          "browser.translations.useLexicalShortlist",
          false
        );
      });
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    translationId: 3,
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Text to translate.",
  });

  await cleanup();
});
