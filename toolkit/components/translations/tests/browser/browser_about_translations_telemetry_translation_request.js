/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests translation-request telemetry for about:translations across initial requests,
 * throttle resets, and source/target language changes.
 */
add_task(
  async function test_about_translations_translation_request_telemetry() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        autoDownloadFromRemoteSettings: true,
      }
    );

    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 0],
      ]
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("es");

    const firstSourceText = "Hello world this is telemetry.";
    const firstSourceTextWordCount = AboutTranslationsTestUtils.getWordCount(
      "en",
      firstSourceText
    );
    const firstTranslationComplete = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.TranslationComplete
    );
    await aboutTranslationsTestUtils.setSourceTextAreaValue(firstSourceText);
    await firstTranslationComplete;

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
        assertForMostRecentEvent: {
          from_language: "en",
          to_language: "es",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: firstSourceText.length,
          source_text_word_count: firstSourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    const secondSourceText = "Hello world this is telemetry updated.";
    const secondTranslationComplete = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.TranslationComplete
    );
    await aboutTranslationsTestUtils.setSourceTextAreaValue(secondSourceText);
    await secondTranslationComplete;

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
      }
    );

    await aboutTranslationsTestUtils.setSourceTextAreaValue("");

    const thirdSourceText = "Brand new context for telemetry.";
    const thirdSourceTextWordCount = AboutTranslationsTestUtils.getWordCount(
      "en",
      thirdSourceText
    );
    const thirdTranslationComplete = aboutTranslationsTestUtils.waitForEvent(
      AboutTranslationsTestUtils.Events.TranslationComplete
    );
    await aboutTranslationsTestUtils.setSourceTextAreaValue(thirdSourceText);
    await thirdTranslationComplete;

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 2],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 2,
        assertForMostRecentEvent: {
          from_language: "en",
          to_language: "es",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: thirdSourceText.length,
          source_text_word_count: thirdSourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    const targetLanguageChangeTranslationComplete =
      aboutTranslationsTestUtils.waitForEvent(
        AboutTranslationsTestUtils.Events.TranslationComplete
      );
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");
    await targetLanguageChangeTranslationComplete;

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 3],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 3,
        assertForMostRecentEvent: {
          from_language: "en",
          to_language: "fr",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: thirdSourceText.length,
          source_text_word_count: thirdSourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    const sourceLanguageChangeTranslationComplete =
      aboutTranslationsTestUtils.waitForEvent(
        AboutTranslationsTestUtils.Events.TranslationComplete
      );
    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("fr");
    await sourceLanguageChangeTranslationComplete;
    const thirdSourceTextWordCountInFrench =
      AboutTranslationsTestUtils.getWordCount("fr", thirdSourceText);

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 4],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 4,
        assertForMostRecentEvent: {
          from_language: "fr",
          to_language: "fr",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: thirdSourceText.length,
          source_text_word_count: thirdSourceTextWordCountInFrench,
          document_language: value => value === undefined,
        },
      }
    );

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [[AboutTranslationsTestUtils.Events.ClearSourceText]],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeClearButton();
      }
    );

    const clearButtonResetSourceText =
      "Clear button resets telemetry throttle.";
    const clearButtonResetSourceTextWordCount =
      AboutTranslationsTestUtils.getWordCount("fr", clearButtonResetSourceText);
    const clearButtonResetTranslationComplete =
      aboutTranslationsTestUtils.waitForEvent(
        AboutTranslationsTestUtils.Events.TranslationComplete
      );
    await aboutTranslationsTestUtils.setSourceTextAreaValue(
      clearButtonResetSourceText
    );
    await clearButtonResetTranslationComplete;

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 5],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 5,
        assertForMostRecentEvent: {
          from_language: "fr",
          to_language: "fr",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: clearButtonResetSourceText.length,
          source_text_word_count: clearButtonResetSourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    await cleanup();
  }
);

/**
 * Tests translation-request telemetry for about:translations when the source language is detected.
 */
add_task(
  async function test_about_translations_translation_request_telemetry_detect_language() {
    const DETECT_LANGUAGE_SOURCE_TEXT = "Hola, ¿cómo estás?";
    const detectedLanguage = "es";
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        autoDownloadFromRemoteSettings: true,
      }
    );

    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 0],
      ]
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("detect");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("en");

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: DETECT_LANGUAGE_SOURCE_TEXT },
          ],
          [
            AboutTranslationsTestUtils.Events.DetectedLanguageUpdated,
            { language: detectedLanguage },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          DETECT_LANGUAGE_SOURCE_TEXT
        );
      }
    );

    const sourceTextWordCount = AboutTranslationsTestUtils.getWordCount(
      detectedLanguage,
      DETECT_LANGUAGE_SOURCE_TEXT
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
        assertForMostRecentEvent: {
          from_language: detectedLanguage,
          to_language: "en",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: DETECT_LANGUAGE_SOURCE_TEXT.length,
          source_text_word_count: sourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    await cleanup();
  }
);

/**
 * Tests that translation-request telemetry for about:translations is throttled
 * within the configured interval and can resume after tests reset throttle state.
 */
add_task(
  async function test_about_translations_translation_request_telemetry_timeout() {
    const translationRequestTelemetryThrottleDelay = 120_000;
    const resumedTelemetryThrottleDelay = 300;
    const inputThrottleDelay = 10;
    const inputDebounceDelay = 20;
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.setTranslationRequestTelemetryThrottleDelay(
      translationRequestTelemetryThrottleDelay
    );
    await aboutTranslationsTestUtils.setThrottleDelay(inputThrottleDelay);
    await aboutTranslationsTestUtils.setDebounceDelay(inputDebounceDelay);
    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("es");

    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 0],
      ]
    );

    const firstSourceText = "First request for timeout path.";
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: firstSourceText },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 1 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          firstSourceText
        );
      }
    );

    const secondSourceText = "Second request should be throttled.";
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: secondSourceText },
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
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          secondSourceText
        );
      }
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
      }
    );

    await aboutTranslationsTestUtils.setTranslationRequestTelemetryThrottleDelay(
      resumedTelemetryThrottleDelay
    );
    await aboutTranslationsTestUtils.clearTranslationRequestTelemetryThrottle();

    const thirdSourceText = "Third request should pass after throttle reset.";
    const thirdSourceTextWordCount = AboutTranslationsTestUtils.getWordCount(
      "en",
      thirdSourceText
    );
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: thirdSourceText },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 3 },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 3 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          thirdSourceText
        );
      }
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 2],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 2,
        assertForMostRecentEvent: {
          from_language: "en",
          to_language: "es",
          auto_translate: false,
          request_target: "about_translations",
          source_text_code_units: thirdSourceText.length,
          source_text_word_count: thirdSourceTextWordCount,
          document_language: value => value === undefined,
        },
      }
    );

    await cleanup();
  }
);

/**
 * Tests that about:translations records translations.error telemetry and
 * resets translation-request telemetry throttling when the error message is shown.
 */
add_task(
  async function test_about_translations_error_telemetry_resets_request_throttle() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        languagePairs: [
          { fromLang: "en", toLang: "fr" },
          { fromLang: "fr", toLang: "en" },
        ],
        autoDownloadFromRemoteSettings: false,
      }
    );

    await aboutTranslationsTestUtils.setTranslationRequestTelemetryThrottleDelay(
      10_000
    );
    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
    await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

    await TestTranslationsTelemetry.assertEvent(Glean.translations.error, {
      expectedEventCount: 0,
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.tryAgainButton,
      {
        expectedEventCount: 0,
      }
    );

    const firstRequestText = "This should fail.";
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.SourceTextInputDebounced,
            { sourceText: firstRequestText },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 1 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.setSourceTextAreaValue(
          firstRequestText
        );
        await aboutTranslationsTestUtils.rejectDownloads(1);
        await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
          visible: true,
        });
      }
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 1],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 1,
      }
    );
    await TestTranslationsTelemetry.assertEvent(Glean.translations.error, {
      expectedEventCount: 1,
      assertForMostRecentEvent: {
        reason: "Error: Intentionally rejecting downloads.",
      },
    });

    const firstRetryErrorMessageHidden =
      aboutTranslationsTestUtils.waitForTranslationErrorMessage({
        visible: false,
      });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 2 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeTranslationErrorButton();
        await firstRetryErrorMessageHidden;
        await aboutTranslationsTestUtils.rejectDownloads(1);
        await aboutTranslationsTestUtils.waitForTranslationErrorMessage({
          visible: true,
        });
      }
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 2],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 2,
      }
    );
    await TestTranslationsTelemetry.assertEvent(Glean.translations.error, {
      expectedEventCount: 2,
      assertForMostRecentEvent: {
        reason: "Error: Intentionally rejecting downloads.",
      },
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.tryAgainButton,
      {
        expectedEventCount: 1,
      }
    );

    const secondRetryErrorMessageHidden =
      aboutTranslationsTestUtils.waitForTranslationErrorMessage({
        visible: false,
      });

    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [
          [
            AboutTranslationsTestUtils.Events.TranslationRequested,
            { translationId: 3 },
          ],
          [
            AboutTranslationsTestUtils.Events.TranslationComplete,
            { translationId: 3 },
          ],
        ],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeTranslationErrorButton();
        await secondRetryErrorMessageHidden;
        await aboutTranslationsTestUtils.resolveDownloads(1);
      }
    );

    await TestTranslationsTelemetry.assertLabeledCounter(
      Glean.translations.requestCount,
      [
        ["full_page", 0],
        ["select", 0],
        ["about_translations", 3],
      ]
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translations.translationRequest,
      {
        expectedEventCount: 3,
      }
    );
    await TestTranslationsTelemetry.assertEvent(Glean.translations.error, {
      expectedEventCount: 2,
    });
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.tryAgainButton,
      {
        expectedEventCount: 2,
      }
    );

    await cleanup();
  }
);
