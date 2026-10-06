/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests basic adding and removing of languages in the Never Translate Languages
 * section, including empty state transitions.
 */
add_task(async function test_never_translate_languages_add_and_remove() {
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

  info("Verifying empty state is visible initially");
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: true,
  });

  info("Adding Spanish (es) via dropdown");
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
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("es");
      await prefChanged;
    }
  );

  info("Verifying Spanish was added");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es"],
    count: 1,
  });
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Adding French (fr) via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("fr");
      await prefChanged;
    }
  );

  info("Verifying French was added");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Adding Ukrainian (uk) via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("uk");
      await prefChanged;
    }
  );

  info("Verifying Ukrainian was added");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Removing middle item (French)");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeNeverTranslateLanguage("fr");
      await prefChanged;
    }
  );

  info("Verifying French was removed");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "uk"],
    count: 2,
  });
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Removing Ukrainian");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeNeverTranslateLanguage("uk");
      await prefChanged;
    }
  );

  info("Verifying Ukrainian was removed");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es"],
    count: 1,
  });
  await translationsSettingsTestUtils.assertNeverTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Removing Spanish (last language)");
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
      const prefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeNeverTranslateLanguage("es");
      await prefChanged;
    }
  );

  info("Verifying all languages removed and empty state reappears");
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
 * Tests that invalid language tags don't break the UI and valid languages
 * are still rendered correctly.
 */
add_task(async function test_never_translate_languages_invalid_tags() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [NEVER_TRANSLATE_LANGS_PREF, "es,fr,uk"],
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

  info("Verifying three valid languages are displayed");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Testing UI doesn't break when pref has mixed valid/invalid tags");
  info("Adding invalid tags via pref change");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      Services.prefs.setCharPref(
        NEVER_TRANSLATE_LANGS_PREF,
        "es,INVALID,fr,uk"
      );
    }
  );

  info("Verifying UI still works and valid languages remain accessible");
  ok(
    document.querySelector('[data-lang-tag="es"]'),
    "Spanish item should still exist"
  );
  ok(
    document.querySelector('[data-lang-tag="fr"]'),
    "French item should still exist"
  );
  ok(
    document.querySelector('[data-lang-tag="uk"]'),
    "Ukrainian item should still exist"
  );

  await cleanup();
});

/**
 * Tests that adding a language to never-translate automatically removes it
 * from the always-translate list ("stealing" behavior).
 */
add_task(async function test_never_translate_languages_stealing() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, "es,fr,uk"],
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

  info("Verifying always-translate has three languages");
  let alwaysLangs = getAlwaysTranslateLanguagesFromPref();
  is(alwaysLangs.length, 3, "Should have 3 always-translate languages");
  ok(
    alwaysLangs.includes("es") &&
      alwaysLangs.includes("fr") &&
      alwaysLangs.includes("uk"),
    "Always-translate should include es, fr, uk"
  );

  info("Adding Spanish to never-translate via UI");
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
      const neverPrefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("es");
      await neverPrefChanged;
    }
  );

  info("Verifying Spanish appears in never-translate list");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es"],
    count: 1,
  });

  info("Verifying Spanish was removed from always-translate pref");
  alwaysLangs = getAlwaysTranslateLanguagesFromPref();
  is(alwaysLangs.length, 2, "Should have 2 always-translate languages");
  ok(
    !alwaysLangs.includes("es"),
    "Always-translate should not include Spanish"
  );
  ok(
    alwaysLangs.includes("fr") && alwaysLangs.includes("uk"),
    "Always-translate should still include French and Ukrainian"
  );

  info("Adding French to never-translate via UI");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const neverPrefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("fr");
      await neverPrefChanged;
    }
  );

  info("Verifying both Spanish and French in never-translate list");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Verifying only Ukrainian remains in always-translate pref");
  alwaysLangs = getAlwaysTranslateLanguagesFromPref();
  is(alwaysLangs.length, 1, "Should have 1 always-translate language");
  ok(
    alwaysLangs.includes("uk"),
    "Always-translate should only include Ukrainian"
  );

  info("Verifying stealing also works via UI for Ukrainian");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.NeverTranslateLanguagesRendered],
      ],
    },
    async () => {
      const neverPrefChanged = TestUtils.waitForPrefChange(
        NEVER_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addNeverTranslateLanguage("uk");
      await neverPrefChanged;
    }
  );

  info("Verifying all three languages now in never-translate");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Verifying always-translate is empty after stealing");
  alwaysLangs = getAlwaysTranslateLanguagesFromPref();
  is(alwaysLangs.length, 0, "Always-translate should be empty after stealing");

  await cleanup();
});
