/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_other_actions_disable_during_active_download() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  await translationsSettingsTestUtils.downloadLanguage({
    langTag: "fr",
    remoteClients,
    inProgressLanguages: ["fr"],
    finalLanguages: ["fr"],
  });

  const started = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadStarted,
    { expectedDetail: { langTag: "es" } }
  );
  const renderInProgress = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: {
        languages: ["fr", "es"],
        count: 2,
        downloading: ["es"],
      },
    }
  );
  const optionsUpdated = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesSelectOptionsUpdated
  );

  await translationsSettingsTestUtils.selectDownloadLanguage("es");
  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start Spanish download while French exists"
  );
  await Promise.all([started, renderInProgress, optionsUpdated]);

  ok(
    translationsSettingsTestUtils.getDownloadLanguageButton().disabled,
    "Download button should be disabled during active download"
  );
  ok(
    translationsSettingsTestUtils.getDownloadedLanguagesSelect().disabled,
    "Download select should be disabled during active download"
  );

  const frenchRemoveButton =
    translationsSettingsTestUtils.getDownloadRemoveButton("fr");
  ok(
    frenchRemoveButton?.disabled,
    "Other delete buttons should stay disabled during download"
  );
  ok(
    !translationsSettingsTestUtils.getDownloadDeleteConfirmButton("fr"),
    "Delete confirmation should not open while download in progress"
  );

  const completed = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadCompleted,
    { expectedDetail: { langTag: "es" } }
  );
  const renderComplete = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: {
        languages: ["fr", "es"],
        count: 2,
        downloading: [],
      },
    }
  );
  const optionsAfter = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesSelectOptionsUpdated
  );

  await remoteClients.translationModels.resolvePendingDownloads(
    TranslationsSettingsTestUtils.getLanguageModelNames("es").length
  );
  await Promise.all([completed, renderComplete, optionsAfter]);

  await cleanup();
});

add_task(async function test_states_reset_after_reload() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  await translationsSettingsTestUtils.downloadLanguage({
    langTag: "es",
    remoteClients,
    inProgressLanguages: ["es"],
    finalLanguages: ["es"],
  });

  info("Trigger French download failure before reloading");
  await translationsSettingsTestUtils.startDownloadFailure({
    langTag: "fr",
    remoteClients,
    inProgressLanguages: ["fr", "es"],
    failedLanguages: ["fr", "es"],
  });

  ok(
    translationsSettingsTestUtils.getDownloadErrorButton("fr"),
    "French error should be visible before opening delete confirmation"
  );

  await translationsSettingsTestUtils.openDownloadDeleteConfirmation("es");
  ok(
    translationsSettingsTestUtils.getDownloadDeleteConfirmButton("es"),
    "Spanish delete confirmation should be open before reload"
  );
  ok(
    !translationsSettingsTestUtils.getDownloadErrorButton("fr"),
    "French error should close when another delete confirmation opens"
  );

  info("Reload about:preferences");
  await loadNewPage(gBrowser.selectedBrowser, "about:preferences");

  const reloadedTestUtils = new TranslationsSettingsTestUtils(
    gBrowser.selectedBrowser.contentDocument
  );

  await reloadedTestUtils.openTranslationsSubpageFromDocument();
  await reloadedTestUtils.assertDownloadedLanguagesEmptyState({
    visible: true,
  });
  is(
    reloadedTestUtils.getSelectedDownloadLanguage(),
    "",
    "Download selection should reset after reload"
  );
  ok(
    !reloadedTestUtils.getDownloadDeleteConfirmButton("es"),
    "Delete confirmation should reset after reload"
  );
  ok(
    !reloadedTestUtils.getDownloadErrorButton("fr"),
    "Failed download state should reset after reload"
  );
  ok(
    !reloadedTestUtils.getDownloadRetryButton("fr"),
    "Retry button should not persist after reload"
  );

  await cleanup();
});
