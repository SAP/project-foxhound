/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_states_reset_after_reopen() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  await translationsSettingsTestUtils.selectDownloadLanguage("es");

  const spanishCompleted = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadCompleted,
    { expectedDetail: { langTag: "es" } }
  );
  const spanishRenderComplete = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: {
        count: 1,
        downloading: [],
      },
    }
  );

  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start es download"
  );
  await remoteClients.translationModels.resolvePendingDownloads(
    TranslationsSettingsTestUtils.getLanguageModelNames("es").length
  );
  await Promise.all([spanishCompleted, spanishRenderComplete]);
  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["es"],
    downloading: [],
    count: 1,
  });

  info("Trigger French download failure before reopening settings");
  await translationsSettingsTestUtils.selectDownloadLanguage("fr");

  const frenchFailed = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadFailed,
    { expectedDetail: { langTag: "fr" } }
  );
  const frenchRenderFailed = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: {
        count: 2,
        downloading: [],
      },
    }
  );

  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start fr download (expect failure)"
  );
  await remoteClients.translationModels.rejectPendingDownloads(
    TranslationsSettingsTestUtils.getLanguageModelNames("fr").length
  );
  await Promise.all([frenchFailed, frenchRenderFailed]);
  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["fr", "es"],
    downloading: [],
    count: 2,
  });

  ok(
    translationsSettingsTestUtils.getDownloadErrorButton("fr"),
    "French error should be visible before opening delete confirmation"
  );

  await translationsSettingsTestUtils.openDownloadDeleteConfirmation("es");
  ok(
    translationsSettingsTestUtils.getDownloadDeleteConfirmButton("es"),
    "Spanish delete confirmation should be open before reopening settings"
  );
  ok(
    !translationsSettingsTestUtils.getDownloadErrorButton("fr"),
    "French error should close when another delete confirmation opens"
  );

  info("Open a fresh about:preferences#languages tab");
  const originalTab = gBrowser.selectedTab;
  const freshTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences#languages",
    true
  );

  const reopenedTestUtils = new TranslationsSettingsTestUtils(
    freshTab.linkedBrowser.contentDocument
  );

  await reopenedTestUtils.openTranslationsSubpageFromDocument();
  await reopenedTestUtils.assertDownloadedLanguagesEmptyState({
    visible: false,
  });
  await reopenedTestUtils.assertDownloadedLanguages({
    languages: ["es"],
    count: 1,
  });
  is(
    reopenedTestUtils.getSelectedDownloadLanguage(),
    "",
    "Download selection should reset after reopening settings"
  );
  ok(
    !reopenedTestUtils.getDownloadDeleteConfirmButton("es"),
    "Delete confirmation should reset after reopening settings"
  );
  ok(
    !reopenedTestUtils.getDownloadErrorButton("fr"),
    "Failed download state should reset after reopening settings"
  );
  ok(
    !reopenedTestUtils.getDownloadRetryButton("fr"),
    "Retry button should not persist after reopening settings"
  );

  gBrowser.selectedTab = originalTab;
  BrowserTestUtils.removeTab(freshTab);

  await cleanup();
});
