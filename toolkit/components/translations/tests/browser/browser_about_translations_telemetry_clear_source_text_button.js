/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records clear-source-text-button telemetry each time the button is invoked.
 */
add_task(
  async function test_about_translations_telemetry_clear_source_text_button() {
    const { aboutTranslationsTestUtils, cleanup } =
      await openAboutTranslations();

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.open,
      {
        expectedEventCount: 1,
        expectNewFlowId: true,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.clearSourceTextButton,
      {
        expectedEventCount: 0,
      }
    );

    await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");

    await aboutTranslationsTestUtils.setSourceTextAreaValue(
      "Clear telemetry first invocation."
    );
    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: true,
    });
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [[AboutTranslationsTestUtils.Events.ClearSourceText]],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeClearButton();
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.clearSourceTextButton,
      {
        expectedEventCount: 1,
        expectNewFlowId: false,
      }
    );

    await aboutTranslationsTestUtils.setSourceTextAreaValue(
      "Clear telemetry second invocation."
    );
    await aboutTranslationsTestUtils.assertSourceClearButton({
      visible: true,
    });
    await aboutTranslationsTestUtils.assertEvents(
      {
        expected: [[AboutTranslationsTestUtils.Events.ClearSourceText]],
      },
      async () => {
        await aboutTranslationsTestUtils.invokeClearButton();
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.clearSourceTextButton,
      {
        expectedEventCount: 2,
        expectNewFlowId: false,
      }
    );

    await cleanup();
  }
);
