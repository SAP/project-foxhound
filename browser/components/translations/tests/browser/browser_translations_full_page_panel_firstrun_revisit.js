/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the first-show intro message message is displayed
 * when viewing the panel subsequent times on the same URL,
 * but is no longer displayed after navigating to new URL,
 * or when returning to the first URL after navigating away.
 */
add_task(async function test_translations_panel_firstrun() {
  const { cleanup } = await loadTestPage({
    page: SPANISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
    prefs: [["browser.translations.panelShown", false]],
  });

  await FullPageTranslationsTestUtils.assertTranslationsButton(
    { button: true, circleArrows: false, locale: false, icon: true },
    "The button is available."
  );

  await FullPageTranslationsTestUtils.openPanel({
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewFirstShow,
  });

  await FullPageTranslationsTestUtils.clickCancelButton();

  await FullPageTranslationsTestUtils.openPanel({
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewFirstShow,
  });

  await FullPageTranslationsTestUtils.clickCancelButton();

  await navigate("Navigate to a different website", {
    url: SPANISH_PAGE_URL_DOT_ORG,
  });

  await FullPageTranslationsTestUtils.openPanel({
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewDefault,
  });

  await FullPageTranslationsTestUtils.clickCancelButton();

  await navigate("Navigate back to the first website", {
    url: SPANISH_PAGE_URL,
  });

  await FullPageTranslationsTestUtils.openPanel({
    onOpenPanel: FullPageTranslationsTestUtils.assertPanelViewDefault,
  });

  await FullPageTranslationsTestUtils.clickCancelButton();

  await cleanup();
});
