/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_other_actions_disable_during_active_download() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  await translationsSettingsTestUtils.selectDownloadLanguage("fr");

  const frenchCompleted = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadCompleted,
    { expectedDetail: { langTag: "fr" } }
  );
  const frenchRenderComplete = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: {
        languages: ["fr"],
        count: 1,
        downloading: [],
      },
    }
  );

  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start fr download"
  );
  await remoteClients.translationModels.resolvePendingDownloads(
    TranslationsSettingsTestUtils.getLanguageModelNames("fr").length
  );
  await Promise.all([frenchCompleted, frenchRenderComplete]);

  await translationsSettingsTestUtils.selectDownloadLanguage("es");

  const realDownloadLanguageFiles = TranslationsParent.downloadLanguageFiles;
  const spanishDownload = Promise.withResolvers();
  const spanishDownloadStarted = Promise.withResolvers();
  TranslationsParent.downloadLanguageFiles = langTag => {
    TranslationsParent.downloadLanguageFiles = realDownloadLanguageFiles;
    is(langTag, "es", "Only the Spanish download should be intercepted");
    spanishDownloadStarted.resolve();
    return spanishDownload.promise;
  };

  await click(
    translationsSettingsTestUtils.getDownloadLanguageButton(),
    "Start Spanish download while French exists"
  );
  await spanishDownloadStarted.promise;
  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["fr", "es"],
    count: 2,
  });

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
        count: 2,
        downloading: [],
      },
    }
  );
  const optionsAfter = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesSelectOptionsUpdated
  );

  spanishDownload.resolve();
  await Promise.all([completed, renderComplete, optionsAfter]);
  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["fr", "es"],
    downloading: [],
    count: 2,
  });

  await cleanup();
});
