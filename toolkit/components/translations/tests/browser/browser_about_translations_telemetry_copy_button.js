/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records copy-button telemetry each time the copy button is invoked.
 */
add_task(async function test_about_translations_telemetry_copy_button() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    autoDownloadFromRemoteSettings: true,
    requireManualCopyButtonReset: true,
  });

  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.open,
    {
      expectedEventCount: 1,
      expectNewFlowId: true,
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.copyButton,
    {
      expectedEventCount: 0,
    }
  );

  await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
  await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("fr");

  const translationComplete = aboutTranslationsTestUtils.waitForEvent(
    AboutTranslationsTestUtils.Events.TranslationComplete
  );
  await aboutTranslationsTestUtils.setSourceTextAreaValue(
    "Copy telemetry test source text."
  );
  await translationComplete;

  await aboutTranslationsTestUtils.assertCopyButton({ enabled: true });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeCopyButton();
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.copyButton,
    {
      expectedEventCount: 1,
      expectNewFlowId: false,
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [[AboutTranslationsTestUtils.Events.CopyButtonShowCopied]],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeCopyButton();
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.copyButton,
    {
      expectedEventCount: 2,
      expectNewFlowId: false,
    }
  );

  await cleanup();
});
