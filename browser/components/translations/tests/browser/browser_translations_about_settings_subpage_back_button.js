/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the translations subpage back button returns to the main page.
 */
add_task(async function test_translations_subpage_back_button() {
  const { cleanup, translationsSettingsTestUtils } =
    await TranslationsSettingsTestUtils.openTranslationsSettingsSubpage();

  const document = gBrowser.selectedBrowser.contentDocument;
  const pane = translationsSettingsTestUtils.getTranslationsPane();

  ok(pane, "Translations setting pane should exist");
  ok(
    translationsSettingsTestUtils.getBackButton(),
    "Translations subpage should include a back button"
  );

  await translationsSettingsTestUtils.clickBackButton();

  is(
    document.location.hash,
    "#general",
    "Hash should return to the General pane after clicking back"
  );
  ok(pane?.hidden, "Translations pane should hide after navigating back");

  const manageButton = await waitForCondition(
    () => document.getElementById("translationsManageButton"),
    "Waiting for translationsManageButton on main page"
  );
  ok(
    BrowserTestUtils.isVisible(manageButton),
    "Main page translations section should be visible"
  );

  await cleanup();
});
