/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_source_clear_button_clears_text_and_target_output() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

    await aboutTranslationsTestUtils.setSourceTextAreaValue("Hello world");
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

    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearSourceText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.CopyButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.clickClearButton();
      }
    );

    await aboutTranslationsTestUtils.assertSourceTextArea({
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });
    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: false,
    });

    await cleanup();
  }
);

add_task(
  async function test_source_clear_button_cancels_translation_in_progress() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS,
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
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          "Clearing in progress"
        );
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearSourceText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.CopyButtonEnabled,
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.TranslationComplete,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.clickClearButton();
      }
    );

    await aboutTranslationsTestUtils.assertSourceTextArea({
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: false,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        unexpected: [AboutTranslationsTestUtils.Events.TranslationComplete],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await cleanup();
  }
);
