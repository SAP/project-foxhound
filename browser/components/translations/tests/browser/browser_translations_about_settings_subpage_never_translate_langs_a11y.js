/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests keyboard activation (Enter key) of remove buttons in the never-translate language list.
 */
add_task(async function test_never_translate_languages_keyboard_activation() {
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

  info("Verifying three language items are rendered");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr", "uk"],
    count: 3,
  });

  info("Getting first remove button");
  const firstRemoveButton = document.querySelector(
    ".translations-never-translate-remove-button"
  );
  ok(firstRemoveButton, "First remove button should exist");

  info("Testing keyboard activation with Enter key");
  firstRemoveButton.focus();
  is(
    document.activeElement,
    firstRemoveButton,
    "Remove button should be focused"
  );

  info("Pressing Enter to remove first language");
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
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      firstRemoveButton.dispatchEvent(enterEvent);
      click(firstRemoveButton, "Activating remove via Enter key");
      await prefChanged;
    }
  );

  info("Verifying language was removed");
  const langs = getNeverTranslateLanguagesFromPref();
  is(langs.length, 2, "Should have 2 languages after removal");

  info("Verifying UI updated to show 2 items");
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    count: 2,
  });

  await cleanup();
});

/**
 * Tests accessibility features including ARIA labels and keyboard-only operation.
 */
add_task(async function test_never_translate_languages_accessibility() {
  const { cleanup, translationsSettingsTestUtils } =
    await setupAboutPreferences(LANGUAGE_PAIRS, {
      prefs: [
        ["browser.settings-redesign.enabled", true],
        [NEVER_TRANSLATE_LANGS_PREF, "es,fr"],
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
  await translationsSettingsTestUtils.assertNeverTranslateLanguages({
    languages: ["es", "fr"],
    count: 2,
  });

  info("Getting language items and remove buttons");
  const items = document.querySelectorAll(
    ".translations-never-translate-language-item"
  );
  is(items.length, 2, "Should have 2 language items");

  info("Verifying remove buttons have accessible labels");
  const removeButtons = document.querySelectorAll(
    ".translations-never-translate-remove-button"
  );
  is(removeButtons.length, 2, "Should have 2 remove buttons");

  for (const button of removeButtons) {
    const ariaLabel =
      button.getAttribute("aria-label") ||
      button.ariaLabel ||
      button.getAttribute("data-l10n-id");
    ok(
      ariaLabel,
      "Remove button should have aria-label or data-l10n-id for accessibility"
    );
    if (typeof ariaLabel === "string") {
      Assert.greater(
        ariaLabel.length,
        0,
        "Remove button accessibility label should not be empty"
      );
    }
  }

  info("Verifying language items have proper semantic structure");
  for (const item of items) {
    const label = item.getAttribute("label");
    ok(label, "Each language item should have a label attribute");
    Assert.greater(label.length, 0, "Label should not be empty");
  }

  await cleanup();
});
