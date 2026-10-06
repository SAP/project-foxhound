/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case ensures source text input is translated on the debounce schedule.
 */
add_task(async function test_about_translations_scheduling() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "en", toLang: "fr" },
      { fromLang: "fr", toLang: "en" },
    ],
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: "Hello world" },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 1 },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");
      await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
    }
  );

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

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Hello world",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      unexpected: [
        AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
        AboutTranslationsTestUtils.Events.TranslationRequested,
        AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
      ],
    },
    async () => {
      info("Temporarily increasing the debounce delay to ten seconds.");
      await aboutTranslationsTestUtils.setDebounceDelay(10_000);
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        "This text should not be translated"
      );

      info("Waiting after updating the text.");
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  );

  info("Restoring the debounce delay to 100ms.");
  await aboutTranslationsTestUtils.setDebounceDelay(100);

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: "This text will be translated" },
        ],
        [
          AboutTranslationsTestUtils.Events.URLUpdatedFromUI,
          {
            sourceLanguage: "en",
            targetLanguage: "fr",
            sourceText: "This text will be translated",
          },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 2 },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 2 },
        ],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        "This text will be translated"
      );
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "This text will be translated",
  });

  await cleanup();
});
