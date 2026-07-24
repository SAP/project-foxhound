/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_download_languages_sorting_and_batch_resolution() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [["browser.settings-redesign.enabled", true]],
    });

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Waiting for translationsManageButton");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  const initialDownloadsRendered = translationsSettingsTestUtils.waitForEvent(
    TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
    {
      expectedDetail: { languages: [], count: 0, downloading: [] },
    }
  );

  info("Opening translations subpage");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [[TranslationsSettingsTestUtils.Events.Initialized]],
    },
    async () => {
      click(manageButton, "Open translations subpage");
    }
  );
  await initialDownloadsRendered;

  const downloadButton =
    translationsSettingsTestUtils.getDownloadLanguageButton();

  info("Verify empty state before downloads");
  await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
    visible: true,
  });

  async function downloadAndResolve(langTag, inProgressLangs, finalOrder) {
    await translationsSettingsTestUtils.selectDownloadLanguage(langTag);

    const started = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events.DownloadStarted,
      { expectedDetail: { langTag } }
    );
    const renderInProgress = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
      {
        expectedDetail: {
          languages: inProgressLangs,
          count: inProgressLangs.length,
          downloading: [langTag],
        },
      }
    );
    const optionsUpdated = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events
        .DownloadedLanguagesSelectOptionsUpdated
    );

    const completed = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events.DownloadCompleted,
      { expectedDetail: { langTag } }
    );
    const renderComplete = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events.DownloadedLanguagesRendered,
      {
        expectedDetail: {
          languages: finalOrder,
          count: finalOrder.length,
          downloading: [],
        },
      }
    );
    const optionsUpdatedAfter = translationsSettingsTestUtils.waitForEvent(
      TranslationsSettingsTestUtils.Events
        .DownloadedLanguagesSelectOptionsUpdated
    );

    await click(downloadButton, `Start ${langTag} download`);
    await Promise.all([started, renderInProgress, optionsUpdated]);

    const modelNames = languageModelNames([
      { fromLang: langTag, toLang: "en" },
      { fromLang: "en", toLang: langTag },
    ]);
    await remoteClients.translationModels.resolvePendingDownloads(
      modelNames.length
    );

    await Promise.all([completed, renderComplete, optionsUpdatedAfter]);
  }

  info("Download French first");
  await downloadAndResolve("fr", ["fr"], ["fr"]);
  await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
    visible: false,
  });
  await translationsSettingsTestUtils.assertDownloadedLanguagesOrder({
    languages: ["fr"],
  });

  info("Download Ukrainian second");
  await downloadAndResolve("uk", ["fr", "uk"], ["fr", "uk"]);
  await translationsSettingsTestUtils.assertDownloadedLanguagesOrder({
    languages: ["fr", "uk"],
  });

  info("Download Spanish; expect it to sort between French and Ukrainian");
  await downloadAndResolve("es", ["fr", "es", "uk"], ["fr", "es", "uk"]);

  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["es", "fr", "uk"],
    downloading: [],
    count: 3,
  });
  await translationsSettingsTestUtils.assertDownloadedLanguagesOrder({
    languages: ["fr", "es", "uk"],
  });
  await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
    visible: false,
  });

  await cleanup();
});
