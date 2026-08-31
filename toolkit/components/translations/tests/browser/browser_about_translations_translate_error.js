/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Ensures translation errors show a message in the target section and retrying
 * can fail before eventually succeeding.
 */
add_task(async function test_about_translations_translate_error_retry_cycle() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "en", toLang: "fr" },
      { fromLang: "fr", toLang: "en" },
    ],
    autoDownloadFromRemoteSettings: false,
  });

  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: "This is a test." },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
        [AboutTranslationsTestUtils.Events.ClearTargetText],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(
        "This is a test."
      );
      await aboutTranslationsTestUtils.rejectDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
    visible: true,
  });

  await aboutTranslationsTestUtils.assertTranslationErrorMessage({
    visible: true,
    targetTextAreaVisible: false,
    retryButtonEnabled: true,
    hasErrorClass: true,
  });
  await aboutTranslationsTestUtils.assertSwapLanguagesButton({
    enabled: false,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
        [AboutTranslationsTestUtils.Events.ClearTargetText],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeTranslationErrorButton();
      await aboutTranslationsTestUtils.rejectDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
    visible: true,
  });

  await aboutTranslationsTestUtils.assertTranslationErrorMessage({
    visible: true,
    targetTextAreaVisible: false,
    retryButtonEnabled: true,
    hasErrorClass: true,
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
      await aboutTranslationsTestUtils.invokeTranslationErrorButton();
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
    visible: false,
  });

  await aboutTranslationsTestUtils.assertTranslationErrorMessage({
    visible: false,
    targetTextAreaVisible: true,
    hasErrorClass: false,
  });

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "This is a test.",
  });

  await cleanup();
});

/**
 * Ensures switching the language pair triggers a new translation from an error state,
 * and that the new translation can fail or succeed.
 */
add_task(
  async function test_about_translations_translate_error_language_switch() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "fr" },
          { fromLang: "fr", toLang: "en" },
          { fromLang: "en", toLang: "de" },
          { fromLang: "de", toLang: "en" },
          { fromLang: "en", toLang: "es" },
          { fromLang: "es", toLang: "en" },
        ],
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: "Switching languages." },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          "Switching languages."
        );
        await aboutTranslationsTestUtils.rejectDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("de");
        await aboutTranslationsTestUtils.rejectDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
      visible: true,
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
        await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("es");
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
      visible: false,
    });

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "en",
      targetLanguage: "es",
      sourceText: "Switching languages.",
    });

    await cleanup();
  }
);
