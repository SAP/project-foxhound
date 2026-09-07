/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that pre-populated languages load correctly when opening the subpage.
 */
add_task(async function test_always_translate_languages_prepopulated() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, "uk,es,fr"],
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

  info("Verifying three language items are displayed");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesOrder({
    languages: ["fr", "es", "uk"],
  });

  info("Verifying empty state is not visible");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguagesEmptyState({
    visible: false,
  });

  await cleanup();
});

/**
 * Tests that the dropdown state is managed correctly - already-added languages
 * should be disabled in the dropdown.
 */
add_task(async function test_always_translate_languages_dropdown_state() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [ALWAYS_TRANSLATE_LANGS_PREF, "es,fr"],
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

  info("Verifying two language items are rendered");
  await translationsSettingsTestUtils.assertAlwaysTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Getting the dropdown element");
  const dropdown =
    translationsSettingsTestUtils.getAlwaysTranslateLanguagesSelect();

  info("Verifying Spanish and French options are disabled");
  const spanishOption = dropdown.querySelector('moz-option[value="es"]');
  const frenchOption = dropdown.querySelector('moz-option[value="fr"]');
  const ukrainianOption = dropdown.querySelector('moz-option[value="uk"]');

  ok(spanishOption, "Spanish option should exist in dropdown");
  ok(frenchOption, "French option should exist in dropdown");
  ok(ukrainianOption, "Ukrainian option should exist in dropdown");

  ok(
    spanishOption.disabled,
    "Spanish option should be disabled (already added)"
  );
  ok(frenchOption.disabled, "French option should be disabled (already added)");
  ok(!ukrainianOption.disabled, "Ukrainian option should not be disabled");

  info("Adding Ukrainian via dropdown");
  await translationsSettingsTestUtils.assertEvents(
    {
      expected: [
        [TranslationsSettingsTestUtils.Events.AlwaysTranslateLanguagesRendered],
        [
          TranslationsSettingsTestUtils.Events
            .AlwaysTranslateLanguagesSelectOptionsUpdated,
        ],
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

  info("Verifying dropdown updated and Ukrainian is now disabled");
  ok(
    ukrainianOption.disabled,
    "Ukrainian option should now be disabled (just added)"
  );

  await dropdown.updateComplete;

  info("Verifying dropdown resets to placeholder");
  is(dropdown.value, "", "Dropdown should reset to empty value");

  await cleanup();
});
