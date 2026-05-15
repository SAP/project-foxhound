/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests basic adding and removing of languages in the Always Translate Languages
 * section, including empty state transitions.
 */
add_task(async function test_always_translate_languages_add_and_remove() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, ""],
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
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: true,
  });

  info("Adding Spanish (es) via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .AlwaysTranslateLanguagesEmptyStateHidden,
        ],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("es");
      await prefChanged;
    }
  );

  info("Verifying Spanish was added");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es"],
    count: 1,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Adding French (fr) via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("fr");
      await prefChanged;
    }
  );

  info("Verifying French was added");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Adding Ukrainian (uk) via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("uk");
      await prefChanged;
    }
  );

  info("Verifying Ukrainian was added");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Removing middle item (French)");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeAlwaysTranslateLanguage("fr");
      await prefChanged;
    }
  );

  info("Verifying French was removed");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "uk"],
    count: 2,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Removing Ukrainian");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeAlwaysTranslateLanguage("uk");
      await prefChanged;
    }
  );

  info("Verifying Ukrainian was removed");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es"],
    count: 1,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: false,
  });

  info("Removing Spanish (last language)");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .AlwaysTranslateLanguagesEmptyStateShown,
        ],
      ],
    },
    async () => {
      const prefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.removeAlwaysTranslateLanguage("es");
      await prefChanged;
    }
  );

  info("Verifying all languages removed and empty state reappears");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: [],
    count: 0,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: true,
  });

  await cleanup();
});

/**
 * Tests that invalid language tags don't break the UI and valid languages
 * are still rendered correctly.
 */
add_task(async function test_always_translate_languages_invalid_tags() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, "es,fr,uk"],
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
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Testing UI doesn't break when pref has mixed valid/invalid tags");
  info("Adding invalid tags via pref change");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      Services.prefs.setCharPref(
        ALWAYS_TRANSLATE_LANGS_PREF,
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
 * Tests that adding a language to always-translate automatically removes it
 * from the never-translate list ("stealing" behavior).
 */
add_task(async function test_always_translate_languages_stealing() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [NEVER_TRANSLATE_LANGS_PREF, "es,fr,uk"],
        [ALWAYS_TRANSLATE_LANGS_PREF, ""],
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

  info("Verifying always-translate section is empty");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: true,
  });

  info("Verifying never-translate has three languages");
  let neverLangs = getNeverTranslateLanguagesFromPref();
  is(neverLangs.length, 3, "Should have 3 never-translate languages");
  ok(
    neverLangs.includes("es") &&
      neverLangs.includes("fr") &&
      neverLangs.includes("uk"),
    "Never-translate should include es, fr, uk"
  );

  info("Adding Spanish to always-translate via UI");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .AlwaysTranslateLanguagesEmptyStateHidden,
        ],
      ],
    },
    async () => {
      const alwaysPrefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("es");
      await alwaysPrefChanged;
    }
  );

  info("Verifying Spanish appears in always-translate list");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es"],
    count: 1,
  });

  info("Verifying Spanish was removed from never-translate pref");
  neverLangs = getNeverTranslateLanguagesFromPref();
  is(neverLangs.length, 2, "Should have 2 never-translate languages");
  ok(!neverLangs.includes("es"), "Never-translate should not include Spanish");
  ok(
    neverLangs.includes("fr") && neverLangs.includes("uk"),
    "Never-translate should still include French and Ukrainian"
  );

  info("Adding French to always-translate via UI");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const alwaysPrefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("fr");
      await alwaysPrefChanged;
    }
  );

  info("Verifying both Spanish and French in always-translate list");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Verifying only Ukrainian remains in never-translate pref");
  neverLangs = getNeverTranslateLanguagesFromPref();
  is(neverLangs.length, 1, "Should have 1 never-translate language");
  ok(
    neverLangs.includes("uk"),
    "Never-translate should only include Ukrainian"
  );

  info("Adding Ukrainian to always-translate via UI");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
      ],
    },
    async () => {
      const alwaysPrefChanged = TestUtils.waitForPrefChange(
        ALWAYS_TRANSLATE_LANGS_PREF
      );
      await translationsSettingsTestUtils.addAlwaysTranslateLanguage("uk");
      await alwaysPrefChanged;
    }
  );

  info("Verifying all three languages now in always-translate");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Verifying never-translate is empty after stealing");
  neverLangs = getNeverTranslateLanguagesFromPref();
  is(neverLangs.length, 0, "Never-translate should be empty after stealing");

  await cleanup();
});
