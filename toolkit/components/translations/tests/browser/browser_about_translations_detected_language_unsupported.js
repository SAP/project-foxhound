/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Ensures unsupported detected languages show an info message and the textarea remains visible.
 */
const SPANISH_TEXT = "Hola, ¿cómo estás?";

add_task(
  async function test_about_translations_detected_language_unsupported_message_clear_button() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

    const detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: SPANISH_TEXT },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(SPANISH_TEXT);
      }
    );

    const { language: detectedLanguage } = await detectedLanguagePromise;
    ok(detectedLanguage, "Expected detected language to be set.");

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertDetectedLanguageUnsupportedMessage({
      visible: true,
      sourceTextAreaVisible: true,
      targetTextAreaVisible: true,
      learnMoreSupportPage: "website-translation",
    });
    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      detectedLanguage,
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: detectedLanguage,
      value: SPANISH_TEXT,
    });
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

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: false,
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });

    await cleanup();
  }
);

add_task(
  async function test_about_translations_detected_language_unsupported_message_manual_clear() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

    const detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: SPANISH_TEXT },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(SPANISH_TEXT);
      }
    );

    const { language: detectedLanguage } = await detectedLanguagePromise;
    ok(detectedLanguage, "Expected detected language to be set.");

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertDetectedLanguageUnsupportedMessage({
      visible: true,
      sourceTextAreaVisible: true,
      targetTextAreaVisible: true,
      learnMoreSupportPage: "website-translation",
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: detectedLanguage,
      value: SPANISH_TEXT,
    });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonHidden],
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: "" },
          ],
        ],
        unexpected: [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.TranslationComplete,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue("");
      }
    );

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: false,
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });

    await cleanup();
  }
);

add_task(
  async function test_about_translations_detected_language_unsupported_message_toggle_source_language() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

    let detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [AboutTranslationsTestUtils.Events.ClearTargetText],
          [AboutTranslationsTestUtils.Events.SourceTextClearButtonShown],
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: SPANISH_TEXT },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(SPANISH_TEXT);
      }
    );

    let { language: detectedLanguage } = await detectedLanguagePromise;
    ok(detectedLanguage, "Expected detected language to be set.");

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertDetectedLanguageUnsupportedMessage({
      visible: true,
      sourceTextAreaVisible: true,
      targetTextAreaVisible: true,
      learnMoreSupportPage: "website-translation",
    });
    await aboutTranslationsTestUtils.assertSourceTextArea({
      languageTag: detectedLanguage,
      value: SPANISH_TEXT,
    });

    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            ({ translationId }) => translationId === 1 || translationId === 2,
          ],
          [AboutTranslationsTestUtils.Events.ShowTranslatingPlaceholder],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("fr");
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            ({ translationId }) => translationId === 1 || translationId === 2,
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: false,
    });

    await aboutTranslationsTestUtils.assertTranslatedText({
      sourceLanguage: "fr",
      targetLanguage: "en",
      sourceText: SPANISH_TEXT,
    });

    detectedLanguagePromise = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.DetectedLanguageUpdated
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [[AboutTranslationsTestUtils.Events.ClearTargetText]],
        unexpected: [
          AboutTranslationsTestUtils.Events.TranslationRequested,
          AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceLanguageSelectorValue(
          "detect"
        );
      }
    );

    ({ language: detectedLanguage } = await detectedLanguagePromise);
    ok(detectedLanguage, "Expected detected language to be set.");

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await aboutTranslationsTestUtils.assertDetectedLanguageUnsupportedMessage({
      visible: true,
      sourceTextAreaVisible: true,
      targetTextAreaVisible: true,
      learnMoreSupportPage: "website-translation",
    });
    await aboutTranslationsTestUtils.assertSourceLanguageSelector({
      detectedLanguage,
    });
    await aboutTranslationsTestUtils.assertTargetTextArea({
      languageTag: null,
      showsPlaceholder: true,
    });

    await cleanup();
  }
);
