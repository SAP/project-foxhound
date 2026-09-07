/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the UI reactively updates when prefs are changed externally
 * while the subpage is open.
 */
add_task(async function test_never_translate_languages_observe_pref_changes() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [NEVER_TRANSLATE_LANGS_PREF, ""],
      ],
    });

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Navigating to translations subpage");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );

  info("Scrolling button into view");
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  info("Clicking manage button and waiting for initialization");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [[TranslationsSettingsTestUtils.Events.Initialized]],
    },
    async () => {
      click(
        manageButton,
        "Clicking manage button to open translations subpage"
      );
    }
  );

  info("Verifying empty state initially visible");
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: true,
  });

  info("Adding Spanish (es) via pref directly");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateLanguagesEmptyStateHidden,
        ],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "es");
    }
  );

  info("Verifying Spanish was added");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es"],
    count: 1,
  });

  info("Adding more languages via pref (es,fr,uk)");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "es,fr,uk");
    }
  );

  info("Verifying all three languages are displayed");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Removing French via pref (es,uk)");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "es,uk");
    }
  );

  info("Verifying French was removed");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "uk"],
    count: 2,
  });

  info("Clearing all languages via pref");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateLanguagesEmptyStateShown,
        ],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "");
    }
  );

  info("Verifying all languages removed and empty state returns");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: [],
    count: 0,
  });
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: true,
  });

  await cleanup();
});

/**
 * Tests that both UI lists update correctly when simulating a stealing scenario
 * by manually adding a language to one pref and removing it from the other.
 */
add_task(async function test_never_translate_languages_simulated_stealing() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, "es,fr"],
        [NEVER_TRANSLATE_LANGS_PREF, ""],
      ],
    });

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Navigating to translations subpage");
  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton"
  );

  info("Scrolling button into view");
  manageButton.scrollIntoView({ behavior: "instant", block: "center" });

  info("Clicking manage button and waiting for initialization");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [[TranslationsSettingsTestUtils.Events.Initialized]],
    },
    async () => {
      click(
        manageButton,
        "Clicking manage button to open translations subpage"
      );
    }
  );

  info("Verifying never-translate section is empty");
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: true,
  });

  info(
    "Simulating stealing by adding Spanish to never-translate and removing from always-translate"
  );
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .NeverTranslateLanguagesEmptyStateHidden,
        ],
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "es");
      Services.prefs.setCharPref(ALWAYS_TRANSLATE_LANGS_PREF, "fr");
    }
  );

  info("Verifying Spanish appears in never-translate UI");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es"],
    count: 1,
  });

  info("Verifying always-translate UI updated to show only French");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["fr"],
    count: 1,
  });

  info(
    "Simulating stealing French by adding to never-translate and removing from always-translate"
  );
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .AlwaysTranslateLanguagesEmptyStateShown,
        ],
      ],
    },
    async () => {
      Services.prefs.setCharPref(NEVER_TRANSLATE_LANGS_PREF, "es,fr");
      Services.prefs.setCharPref(ALWAYS_TRANSLATE_LANGS_PREF, "");
    }
  );

  info("Verifying both Spanish and French in never-translate UI");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Verifying always-translate UI shows empty state");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: [],
    count: 0,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: true,
  });

  await cleanup();
});
