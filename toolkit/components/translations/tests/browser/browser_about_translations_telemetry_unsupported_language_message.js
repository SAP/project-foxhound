/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records unsupported-language-message telemetry
 * each time the detected-language unsupported message is shown.
 */
add_task(
  async function test_about_translations_telemetry_unsupported_language_message() {
    const SPANISH_TEXT = "Hola, ¿cómo estás?";
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: LANGUAGE_PAIRS_WITHOUT_SPANISH,
        autoDownloadFromRemoteSettings: false,
      }
    );

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.open,
      {
        expectedEventCount: 1,
        expectNewFlowId: true,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.unsupportedLanguageMessage,
      {
        expectedEventCount: 0,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");

    const firstDetectedLanguagePromise =
      aboutTranslationsTestUtils.waitForEvent(
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
    const { language: detectedLanguage } = await firstDetectedLanguagePromise;
    const sourceTextWordCount = AboutTranslationsTestUtils.getWordCount(
      detectedLanguage,
      SPANISH_TEXT
    );

    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.unsupportedLanguageMessage,
      {
        expectedEventCount: 1,
        expectNewFlowId: false,
        assertForMostRecentEvent: {
          detected_language: detectedLanguage,
          source_text_code_units: SPANISH_TEXT.length,
          source_text_word_count: sourceTextWordCount,
        },
      }
    );

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
    await aboutTranslationsTestUtils.waitForDetectedLanguageUnsupportedMessage({
      visible: true,
    });

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.unsupportedLanguageMessage,
      {
        expectedEventCount: 2,
        expectNewFlowId: false,
        assertForMostRecentEvent: {
          detected_language: detectedLanguage,
          source_text_code_units: SPANISH_TEXT.length,
          source_text_word_count: sourceTextWordCount,
        },
      }
    );

    await cleanup();
  }
);
