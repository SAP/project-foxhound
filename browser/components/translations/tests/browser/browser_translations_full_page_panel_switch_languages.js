/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests switching the language.
 */
add_task(async function test_translations_panel_switch_language() {
  const { cleanup, resolveDownloads, runInPage } = await loadTestPage({
    page: SPANISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
  });

  await FullPageTranslationsTestUtils.assertTranslationsButton(
    { button: true },
    "The button is available."
  );

  await FullPageTranslationsTestUtils.assertPageIsNotTranslated(runInPage);

  await FullPageTranslationsTestUtils.openPanel({
    expectedFromLanguage: "es",
    expectedToLanguage: "en",
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewIntro,
  });

  const { translateButton } = FullPageTranslationsPanel.elements;

  ok(!translateButton.disabled, "The translate button starts as enabled");

  await FullPageTranslationsTestUtils.changeSelectedFromLanguage({
    langTag: "en",
  });

  ok(
    translateButton.disabled,
    "The translate button is disabled when the languages are the same"
  );

  await FullPageTranslationsTestUtils.changeSelectedFromLanguage({
    langTag: "es",
  });

  ok(
    !translateButton.disabled,
    "When the languages are different it can be translated"
  );

  await FullPageTranslationsTestUtils.changeSelectedFromLanguage({
    langTag: "",
  });

  ok(
    translateButton.disabled,
    "The translate button is disabled nothing is selected."
  );

  await FullPageTranslationsTestUtils.changeSelectedFromLanguage({
    langTag: "en",
  });
  await FullPageTranslationsTestUtils.changeSelectedToLanguage({
    langTag: "fr",
  });

  ok(!translateButton.disabled, "The translate button can now be used");

  await FullPageTranslationsTestUtils.clickTranslateButton({
    downloadHandler: resolveDownloads,
  });

  await FullPageTranslationsTestUtils.assertOnlyIntersectingNodesAreTranslated({
    fromLanguage: "en",
    toLanguage: "fr",
    runInPage,
  });

  await cleanup();
});

add_task(async function test_translations_panel_switch_language_same_as_page() {
  const { cleanup } = await loadTestPage({
    page: ENGLISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
  });

  const { translateButton } = FullPageTranslationsPanel.elements;

  await FullPageTranslationsTestUtils.openPanel({
    expectedFromLanguage: "en",
    expectedToLanguage: "",
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewIntro,
    openFromAppMenu: true,
  });

  ok(
    translateButton.disabled,
    "translations button is unavailable on the English page before opening from the app menu"
  );

  await FullPageTranslationsTestUtils.changeSelectedFromLanguage({
    langTag: "es",
  });

  await waitForCondition(
    () => FullPageTranslationsPanel.elements.toMenuList.value === "en",
    "Wait for the target language to update to English."
  );

  await FullPageTranslationsTestUtils.assertSelectedToLanguage({
    langTag: "en",
  });

  ok(
    !translateButton.disabled,
    "The translate button is enabled when a valid language is selected"
  );

  await cleanup();
});
