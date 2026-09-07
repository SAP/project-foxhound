/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_delete_confirmation_replaced_by_new_confirmation() {
    const { cleanup, remoteClients, translationsSettingsTestUtils } =
      await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

    await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
      visible: true,
    });

    info("Download French");
    await translationsSettingsTestUtils.downloadLanguage({
      langTag: "fr",
      remoteClients,
      inProgressLanguages: ["fr"],
      finalLanguages: ["fr"],
    });

    info("Download Spanish");
    await translationsSettingsTestUtils.downloadLanguage({
      langTag: "es",
      remoteClients,
      inProgressLanguages: ["fr", "es"],
      finalLanguages: ["fr", "es"],
    });

    await translationsSettingsTestUtils.openDownloadDeleteConfirmation("fr");
    ok(
      translationsSettingsTestUtils.getDownloadDeleteConfirmButton("fr"),
      "French delete confirmation should be shown"
    );

    await translationsSettingsTestUtils.openDownloadDeleteConfirmation("es");
    ok(
      translationsSettingsTestUtils.getDownloadDeleteConfirmButton("es"),
      "Spanish delete confirmation should be shown"
    );
    ok(
      !translationsSettingsTestUtils.getDownloadDeleteConfirmButton("fr"),
      "French delete confirmation should close when Spanish opens"
    );
    ok(
      translationsSettingsTestUtils.getDownloadRemoveButton("fr"),
      "French delete icon should return after switching confirmations"
    );

    await cleanup();
  }
);

add_task(async function test_delete_confirmation_closes_when_download_starts() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  await translationsSettingsTestUtils.downloadLanguage({
    langTag: "fr",
    remoteClients,
    inProgressLanguages: ["fr"],
    finalLanguages: ["fr"],
  });

  await translationsSettingsTestUtils.openDownloadDeleteConfirmation("fr");
  ok(
    translationsSettingsTestUtils.getDownloadDeleteConfirmButton("fr"),
    "French delete confirmation should be open before starting new download"
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
  const started = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadStarted,
    { expectedDetail: { langTag: "es" } }
  );

  await translationsSettingsTestUtils.selectDownloadLanguage("es");
  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start Spanish download"
  );
  await Promise.all([renderInProgress, optionsUpdated, started]);

  ok(
    !translationsSettingsTestUtils.getDownloadDeleteConfirmButton("fr"),
    "Delete confirmation should close when download begins"
  );
  const frenchRemoveButton =
    translationsSettingsTestUtils.getDownloadRemoveButton("fr");
  ok(
    frenchRemoveButton?.disabled,
    "Other delete buttons should be disabled during download"
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

add_task(
  async function test_failed_download_closes_when_delete_confirmation_opens() {
    const { cleanup, remoteClients, translationsSettingsTestUtils } =
      await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

    await translationsSettingsTestUtils.downloadLanguage({
      langTag: "es",
      remoteClients,
      inProgressLanguages: ["es"],
      finalLanguages: ["es"],
    });

    info("Start French download expecting failure");
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
      "Spanish delete confirmation should be shown"
    );
    ok(
      !translationsSettingsTestUtils.getDownloadErrorButton("fr"),
      "French failure state should close when delete confirmation opens"
    );
    ok(
      !translationsSettingsTestUtils.getDownloadRetryButton("fr"),
      "Retry button should close with error state"
    );
    await translationsSettingsTestUtils.assertDownloadedLanguages({
      languages: ["es"],
      downloading: [],
      count: 1,
    });

    await cleanup();
  }
);
