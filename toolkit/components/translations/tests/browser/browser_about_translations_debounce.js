/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test case ensures that new inputs to the source text area are only picked
 * up once every cycle of the debounce delay.
 */
add_task(async function test_about_translations_debounce() {
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
      ],
    },
    async () => {
      info("Temporarily increasing the debounce delay to one second.");
      const oneSecondDelay = 1000;
      await aboutTranslationsTestUtils.setDebounceDelay(oneSecondDelay);
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        "This text should not be translated"
      );

      info("Waiting half a second after updating the text.");
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, oneSecondDelay / 2));
    }
  );

  info("Restoring the debounce delay to 200ms.");
  await aboutTranslationsTestUtils.setDebounceDelay(200);

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
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
