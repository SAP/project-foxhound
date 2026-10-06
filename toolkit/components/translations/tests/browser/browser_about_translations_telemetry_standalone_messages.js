/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records telemetry when the language-load-error
 * message is shown.
 */
add_task(
  async function test_about_translations_telemetry_language_load_error_message() {
    const realGetSupportedLanguages = TranslationsParent.getSupportedLanguages;
    TranslationsParent.getSupportedLanguages = () => {
      throw new Error("Simulating getSupportedLanguages() failure.");
    };
    let cleanup = async () => {};

    try {
      const { aboutTranslationsTestUtils, cleanup: openCleanup } =
        await openAboutTranslations({
          languagePairs: [
            { fromLang: "en", toLang: "fr" },
            { fromLang: "fr", toLang: "en" },
          ],
        });
      cleanup = openCleanup;

      await aboutTranslationsTestUtils.assertIsVisible(
        aboutTranslationsStandaloneMessageVisibilityExpectations({
          languageLoadErrorMessage: true,
        })
      );

      await TestTranslationsTelemetry.assertEvent(
        Glean.translationsAboutTranslationsPage.open,
        {
          expectedEventCount: 1,
          expectNewFlowId: true,
        }
      );
      await TestTranslationsTelemetry.assertEvent(
        Glean.translationsAboutTranslationsPage.languageLoadErrorMessage,
        {
          expectedEventCount: 1,
          expectNewFlowId: false,
        }
      );
      await TestTranslationsTelemetry.assertEvent(
        Glean.translationsAboutTranslationsPage.unsupportedInfoMessage,
        {
          expectedEventCount: 0,
        }
      );
      await TestTranslationsTelemetry.assertEvent(
        Glean.translationsAboutTranslationsPage.policyDisabledInfoMessage,
        {
          expectedEventCount: 0,
        }
      );
      await TestTranslationsTelemetry.assertEvent(
        Glean.translationsAboutTranslationsPage.featureBlockedInfoMessage,
        {
          expectedEventCount: 0,
        }
      );
    } finally {
      TranslationsParent.getSupportedLanguages = realGetSupportedLanguages;
      await cleanup();
    }
  }
);

/**
 * Tests that about:translations records telemetry when the unsupported-info
 * message is shown.
 */
add_task(
  async function test_about_translations_telemetry_unsupported_info_message() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        autoDownloadFromRemoteSettings: true,
        prefs: [["browser.translations.simulateUnsupportedEngine", true]],
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsStandaloneMessageVisibilityExpectations({
        unsupportedInfoMessage: true,
      })
    );

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.open,
      {
        expectedEventCount: 1,
        expectNewFlowId: true,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.unsupportedInfoMessage,
      {
        expectedEventCount: 1,
        expectNewFlowId: false,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.languageLoadErrorMessage,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.policyDisabledInfoMessage,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.featureBlockedInfoMessage,
      {
        expectedEventCount: 0,
      }
    );

    await cleanup();
  }
);

/**
 * Tests that about:translations records telemetry when the policy-disabled-info
 * message is shown.
 */
add_task(
  async function test_about_translations_telemetry_policy_disabled_info_message() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        featureEnabled: false,
        lockEnabledState: true,
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsStandaloneMessageVisibilityExpectations({
        policyDisabledInfoMessage: true,
      })
    );

    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.open,
      {
        expectedEventCount: 1,
        expectNewFlowId: true,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.policyDisabledInfoMessage,
      {
        expectedEventCount: 1,
        expectNewFlowId: false,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.languageLoadErrorMessage,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.unsupportedInfoMessage,
      {
        expectedEventCount: 0,
      }
    );
    await TestTranslationsTelemetry.assertEvent(
      Glean.translationsAboutTranslationsPage.featureBlockedInfoMessage,
      {
        expectedEventCount: 0,
      }
    );

    await cleanup();
  }
);
