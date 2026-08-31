/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that about:translations records telemetry when the feature-blocked-info
 * message is shown.
 */
add_task(
  async function test_about_translations_telemetry_feature_blocked_info_message() {
    const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations(
      {
        featureEnabled: false,
        autoDownloadFromRemoteSettings: true,
      }
    );

    await aboutTranslationsTestUtils.assertIsVisible(
      aboutTranslationsVisibilityExpectations({
        featureBlockedInfoMessage: true,
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
      Glean.translationsAboutTranslationsPage.featureBlockedInfoMessage,
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
      Glean.translationsAboutTranslationsPage.policyDisabledInfoMessage,
      {
        expectedEventCount: 0,
      }
    );

    await cleanup();
  }
);

/**
 * Tests that about:translations records telemetry when the feature-blocked
 * unblock control is invoked.
 */
add_task(async function test_about_translations_telemetry_unblock_feature() {
  const { aboutTranslationsTestUtils, cleanup } = await openAboutTranslations({
    featureEnabled: false,
    autoDownloadFromRemoteSettings: true,
  });

  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.unblockFeature,
    {
      expectedEventCount: 0,
    }
  );

  await aboutTranslationsTestUtils.assertEvents(
    {
      expected: [
        [
          AboutTranslationsTestUtils.Events.EnabledStateChanged,
          { enabled: true },
        ],
      ],
    },
    async () => {
      await aboutTranslationsTestUtils.invokeUnblockFeatureButton();
    }
  );

  await TestTranslationsTelemetry.assertEvent(
    Glean.translationsAboutTranslationsPage.unblockFeature,
    {
      expectedEventCount: 1,
    }
  );

  await cleanup();
});
