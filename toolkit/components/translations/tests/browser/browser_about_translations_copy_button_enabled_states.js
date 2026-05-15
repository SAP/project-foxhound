/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const languagePairs = [
  { fromLang: "en", toLang: "fr" },
  { fromLang: "fr", toLang: "en" },
  { fromLang: "en", toLang: "de" },
  { fromLang: "de", toLang: "en" },
];

add_task(
  async function test_copy_button_disabled_until_translation_completes() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
        ],
        unexpected: [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
      }
    );

    await aboutTranslationsTestUtils.assertTranslatingPlaceholder();
    await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
          [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "en",
      targetLanguage: "fr",
      sourceText: "Hello world",
    });

    await cleanup();
  }
);

add_task(async function test_copy_button_disables_when_translation_cleared() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
  });

  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 1 },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello again");
    }
  );

  await aboutTranslationsTestUtils.assertTranslatingPlaceholder();
  await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 1 },
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Hello again",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 2 },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
    },
    async () => {
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("de");
    }
  );

  await aboutTranslationsTestUtils.assertTranslatingPlaceholder();
  await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 2 },
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "de",
    sourceText: "Hello again",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
        [AboutTranslationsTestUtils.Events.ClearTargetText],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.CopyButtonEnabled,
        AboutTranslationsTestUtils.Events.TranslationRequested,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("");
    }
  );

  await aboutTranslationsTestUtils.assertTargetTextArea({
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });

  await cleanup();
});
