/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const languagePairs = [
  { fromLang: "en", toLang: "fr" },
  { fromLang: "fr", toLang: "en" },
  { fromLang: "en", toLang: "de" },
  { fromLang: "de", toLang: "en" },
];

add_task(async function test_copy_button_copies_text_and_resets() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
    requireManualCopyButtonReset: true,
  });
  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello clipboard");
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          AboutTranslationsTestUtils.AnyEventDetail,
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText: "Hello clipboard",
  });
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  const expectedClipboardText =
    await aboutTranslationsTestUtils.getTargetTextAreaValue();
  SpecialPowers.clipboardCopyString("initial clipboard value");

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: true,
    l10nId: "about-translations-copy-button-copied",
  });

  await TestUtils.waitForCondition(
    () =>
      SpecialPowers.getClipboardData("text/plain") === expectedClipboardText,
    "Waiting for the translated text to reach the clipboard."
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonReset]],
    },
    async () => {
      await aboutTranslationsTestUtils.resetCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  await cleanup();
});

add_task(async function test_copy_button_reset_clears_copied_state() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
    requireManualCopyButtonReset: true,
  });
  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  const sourceText = "Hello clipboard";
  await aboutTranslationsTestUtils.setSourceTextAreaValue(sourceText);
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          AboutTranslationsTestUtils.AnyEventDetail,
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonReset]],
    },
    async () => {
      await aboutTranslationsTestUtils.resetCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: true,
  });

  await cleanup();
});

add_task(async function test_copy_button_reset_when_target_language_changes() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
    requireManualCopyButtonReset: true,
  });
  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  const sourceText = "Hello clipboard";
  await aboutTranslationsTestUtils.setSourceTextAreaValue(sourceText);
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          AboutTranslationsTestUtils.AnyEventDetail,
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "fr",
    sourceText,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.CopyButtonReset],
        [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("de");
    }
  );
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: false,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          AboutTranslationsTestUtils.AnyEventDetail,
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );
  await aboutTranslationsTestUtils.assertTranslatedText({
    sourceLanguage: "en",
    targetLanguage: "de",
    sourceText,
  });
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  await cleanup();
});

add_task(async function test_copy_button_reset_timeout_fires_event() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs,
    autoDownloadFromRemoteSettings: false,
    copyButtonResetDelay: 200,
  });
  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  await aboutTranslationsTestUtils.setSourceTextAreaValue("Timeout reset");
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          AboutTranslationsTestUtils.AnyEventDetail,
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.resolveDownloads(1);
    }
  );

  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  SpecialPowers.clipboardCopyString("initial clipboard value");
  const resetEventPromise = aboutTranslationsTestUtils.waitForEvent(
    AboutTranslationsTestUtils.Events.CopyButtonReset
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.clickCopyButton();
    }
  );

  await resetEventPromise;
  await aboutTranslationsTestUtils.assertCopyButton({
    enabled: true,
    copied: false,
    l10nId: "about-translations-copy-button-default",
  });

  await cleanup();
});
