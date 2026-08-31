/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records swap-button telemetry each time the button is invoked.
 */
add_task(async function test_about_translations_telemetry_swap_button() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    languagePairs: [
      { fromLang: "en", toLang: "ja" },
      { fromLang: "ja", toLang: "en" },
    ],
  });

  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.open,
    {
      expectedEventCount: 1,
      expectNewFlowId: true,
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.swapButton,
    {
      expectedEventCount: 0,
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
      ],
      unexpected: [
        AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled,
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.setSourceLanguageSelectorValue("en");
      await aboutTranslationsTestUtils.setTargetLanguageSelectorValue("ja");
    }
  );

  await aboutTranslationsTestUtils.assertSwapLanguagesButton({
    enabled: true,
  });

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeSwapLanguagesButton();
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.swapButton,
    {
      expectedEventCount: 1,
      expectNewFlowId: false,
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonDisabled],
        [AboutTranslationsTestUtils.Events.SwapLanguagesButtonEnabled],
      ],
      unexpected: [AboutTranslationsTestUtils.Events.TranslationRequested],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeSwapLanguagesButton();
    }
  );
  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.swapButton,
    {
      expectedEventCount: 2,
      expectNewFlowId: false,
    }
  );

  await cleanup();
});
