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
            { translationId: 1 },
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
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: "en",
      value: "Hello world",
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: "fr",
      value: "HELLO WORLD [en to fr]",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearSourceText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: "" },
          ],
          [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.CopyButtonEnabled,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeClearButton();
      }
    );

    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
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

    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: "en",
      value: "Clearing in progress",
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: Services.locale.appLocaleAsBCP47,
      value: "Translating…",
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearSourceText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: "" },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.CopyButtonEnabled,
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.TranslationComplete,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeClearButton();
      }
    );

    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
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

add_task(async function test_source_clear_button_can_be_undone() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: LANGUAGE_PAIRS,
    autoDownloadFromRemoteSettings: false,
  });

  const sourceText = "Clear button undo restores this text.";
  const targetText = "CLEAR BUTTON UNDO RESTORES THIS TEXT. [en to fr]";

  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");
  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 1 },
        ],
        [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationComplete],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceTextAreaValue(sourceText);
    }
  );

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

  await aboutTranslationsTestUtils.assertSourceTextArea({
    languageTag: "en",
    value: sourceText,
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    languageTag: "fr",
    value: targetText,
  });

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.ClearSourceText],
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
        [AboutTranslationsTestUtils.Events.ClearTargetText],
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText: "" },
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonDisabled],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.TranslationRequested,
        AboutTranslationsTestUtils.Events.TranslationComplete,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeClearButton();
    }
  );

  await aboutTranslationsTestUtils.assertSourceTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    languageTag: null,
    showsPlaceholder: true,
  });

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: false });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: false,
  });

  Assert.ok(
    !document.getElementById("menu_undo").disabled,
    "Undo menu item is enabled"
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
        [
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
          { sourceText },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          { translationId: 2 },
        ],
        [
          AboutTranslationsTestUtils.Events.TranslationComplete,
          { translationId: 2 },
        ],
        [AboutTranslationsTestUtils.Events.CopyButtonEnabled],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.ClearSourceText],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeSourceTextAreaUndoAction();
    }
  );

  await aboutTranslationsTestUtils.assertSourceTextArea({
    languageTag: "en",
    value: sourceText,
  });
  await aboutTranslationsTestUtils.assertTargetTextArea({
    languageTag: "fr",
    value: targetText,
  });

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });
  await aboutTranslationsTestUtils.assertSourceClearButton({
    visible: true,
  });

  await cleanup();
});
