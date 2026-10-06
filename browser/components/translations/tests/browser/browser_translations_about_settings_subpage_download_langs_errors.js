/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(2);

add_task(
  async function test_download_error_retry_via_selector_and_main_button() {
    const { cleanup, remoteClients, translationsSettingsTestUtils } =
      await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

    const document = gBrowser.selectedBrowser.contentDocument;
    const downloadButton =
      translationsSettingsTestUtils.getDownloadLanguageButton();

    await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
      visible: true,
    });

    await translationsSettingsTestUtils.startDownloadFailure({
      langTag: "fr",
      remoteClients,
    });

    const errorButton =
      translationsSettingsTestUtils.getDownloadErrorButton("fr");
    const retryButton =
      translationsSettingsTestUtils.getDownloadRetryButton("fr");
    ok(errorButton, "Error icon should be visible");
    ok(retryButton, "Retry button should be visible");
    is(
      errorButton.getAttribute("type"),
      "icon ghost",
      "Error icon should use ghost styling"
    );
    const errorMessage = getByL10nId(
      "settings-translations-subpage-download-error",
      document
    );
    ok(errorMessage, "Error message should be shown");
    is(
      translationsSettingsTestUtils.getSelectedDownloadLanguage(),
      "fr",
      "French should stay selected after failed download"
    );
    ok(
      !downloadButton.disabled,
      "Download button should stay enabled after failed download"
    );

    info("Retry French download via main button");
    await translationsSettingsTestUtils.selectDownloadLanguage("fr");
    await click(downloadButton, "Retry French download via main button");

    const modelNames =
      TranslationsSettingsTestUtils.getLanguageModelNames("fr");
    await remoteClients.translationModels.resolvePendingDownloads(
      modelNames.length
    );

    info("Waiting for French retry to finish");
    await waitForCondition(
      () =>
        translationsSettingsTestUtils.getDownloadRemoveButton("fr") &&
        !translationsSettingsTestUtils.getDownloadRetryButton("fr"),
      "Waiting for French download to succeed after retry"
    );

    await translationsSettingsTestUtils.assertDownloadedLanguages({
      languages: ["fr"],
      downloading: [],
      count: 1,
    });
    is(
      translationsSettingsTestUtils.getSelectedDownloadLanguage(),
      "",
      "Download selection should reset after successful retry"
    );
    await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
      visible: false,
    });

    await cleanup();
  }
);

add_task(async function test_download_error_retry_via_retry_button() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  const document = gBrowser.selectedBrowser.contentDocument;
  const downloadButton =
    translationsSettingsTestUtils.getDownloadLanguageButton();

  await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
    visible: true,
  });

  await translationsSettingsTestUtils.startDownloadFailure({
    langTag: "es",
    remoteClients,
  });

  const errorButton =
    translationsSettingsTestUtils.getDownloadErrorButton("es");
  const retryButton =
    translationsSettingsTestUtils.getDownloadRetryButton("es");
  ok(errorButton, "Error icon should be visible");
  ok(retryButton, "Retry button should be visible");
  is(
    errorButton.getAttribute("type"),
    "icon ghost",
    "Error icon should use ghost styling"
  );
  const errorMessage = getByL10nId(
    "settings-translations-subpage-download-error",
    document
  );
  ok(errorMessage, "Error message should be shown");
  const errorRow =
    await translationsSettingsTestUtils.waitForDownloadedLanguageItem("es");
  ok(
    errorRow.classList.contains("translations-download-language-error"),
    "Error row should have the error class"
  );
  is(
    translationsSettingsTestUtils.getSelectedDownloadLanguage(),
    "es",
    "Spanish should stay selected after failed download"
  );
  ok(
    !downloadButton.disabled,
    "Download button should stay enabled after failed download"
  );

  info("Retry Spanish download via inline retry button");
  await translationsSettingsTestUtils.clickDownloadRetry("es");

  const modelNames = TranslationsSettingsTestUtils.getLanguageModelNames("es");
  await remoteClients.translationModels.resolvePendingDownloads(
    modelNames.length
  );

  info("Waiting for Spanish retry to finish");
  await waitForCondition(
    () =>
      translationsSettingsTestUtils.getDownloadRemoveButton("es") &&
      !translationsSettingsTestUtils.getDownloadRetryButton("es"),
    "Waiting for Spanish download to succeed after retry button"
  );

  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["es"],
    downloading: [],
    count: 1,
  });
  is(
    translationsSettingsTestUtils.getSelectedDownloadLanguage(),
    "",
    "Download selection should reset after retry success"
  );
  await translationsSettingsTestUtils.assertDownloadedLanguagesEmptyState({
    visible: false,
  });

  await cleanup();
});

add_task(async function test_download_delete_cancel_restores_state() {
  const { cleanup, remoteClients, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  const downloadButton =
    translationsSettingsTestUtils.getDownloadLanguageButton();

  await translationsSettingsTestUtils.selectDownloadLanguage("uk");
  info("Download Ukrainian");
  await click(downloadButton, "Download Ukrainian");

  const modelNames = TranslationsSettingsTestUtils.getLanguageModelNames("uk");
  await remoteClients.translationModels.resolvePendingDownloads(
    modelNames.length
  );
  info("Waiting for Ukrainian download to complete");
  await waitForCondition(
    () =>
      translationsSettingsTestUtils.getDownloadRemoveButton("uk") &&
      !translationsSettingsTestUtils.getDownloadRetryButton("uk"),
    "Waiting for Ukrainian download to complete"
  );

  await translationsSettingsTestUtils.openDownloadDeleteConfirmation("uk");
  info("Cancel delete for Ukrainian");
  await translationsSettingsTestUtils.cancelDownloadDelete("uk");

  await translationsSettingsTestUtils.assertDownloadedLanguages({
    languages: ["uk"],
    downloading: [],
    count: 1,
  });

  await cleanup();
});
