/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the "More translation settings" button in about:preferences
 * properly navigates to the translations subpage and that all default-state
 * elements are visible.
 */
add_task(
  async function test_translations_subpage_button_and_default_elements() {
    const { cleanup } = await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [["browser.settings-redesign.enabled", true]],
    });

    const document = gBrowser.selectedBrowser.contentDocument;

    info("Waiting for the translationsManageButton to be available");
    const button = await waitForCondition(
      () => document.getElementById("translationsManageButton"),
      "Waiting for translationsManageButton to be visible"
    );

    await ensureVisibility({
      message: "translationsManageButton should be visible",
      visible: { button },
    });

    info("Scrolling button into view");
    button.scrollIntoView({ behavior: "instant", block: "center" });

    info("Clicking button to navigate to translations subpage");
    click(button, "Navigating to translations subpage");

    info("Waiting for default-state element in Always Translate section");
    const alwaysTranslateDefaultRow = await waitForCondition(
      () =>
        document.getElementById("translationsAlwaysTranslateLanguagesNoneRow"),
      "Waiting for translationsAlwaysTranslateLanguagesNoneRow to be visible"
    );

    await ensureVisibility({
      message: "Always Translate default row should be visible",
      visible: { alwaysTranslateDefaultRow },
    });
    is(
      alwaysTranslateDefaultRow.getAttribute("data-l10n-id"),
      "settings-translations-subpage-no-languages-added",
      "Always Translate default row has correct l10n ID"
    );

    info("Waiting for default-state element in Never Translate section");
    const neverTranslateDefaultRow = await waitForCondition(
      () =>
        document.getElementById("translationsNeverTranslateLanguagesNoneRow"),
      "Waiting for translationsNeverTranslateLanguagesNoneRow to be visible"
    );

    await ensureVisibility({
      message: "Never Translate default row should be visible",
      visible: { neverTranslateDefaultRow },
    });
    is(
      neverTranslateDefaultRow.getAttribute("data-l10n-id"),
      "settings-translations-subpage-no-languages-added",
      "Never Translate default row has correct l10n ID"
    );

    info("Waiting for default-state element in Never Translate Sites section");
    const neverTranslateSitesDefaultRow = await waitForCondition(
      () => document.getElementById("translationsNeverTranslateSitesNoneRow"),
      "Waiting for translationsNeverTranslateSitesNoneRow to be visible"
    );

    await ensureVisibility({
      message: "Never Translate Sites default row should be visible",
      visible: { neverTranslateSitesDefaultRow },
    });
    is(
      neverTranslateSitesDefaultRow.getAttribute("data-l10n-id"),
      "settings-translations-subpage-no-sites-added",
      "Never Translate Sites default row has correct l10n ID"
    );

    info("Waiting for default-state element in Download Languages section");
    const downloadLanguagesDefaultRow = await waitForCondition(
      () => document.getElementById("translationsDownloadLanguagesNoneRow"),
      "Waiting for translationsDownloadLanguagesNoneRow to be visible"
    );

    await ensureVisibility({
      message: "Download Languages default row should be visible",
      visible: { downloadLanguagesDefaultRow },
    });
    is(
      downloadLanguagesDefaultRow.getAttribute("data-l10n-id"),
      "settings-translations-subpage-no-languages-downloaded",
      "Download Languages default row has correct l10n ID"
    );

    await cleanup();
  }
);
