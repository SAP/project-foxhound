/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ACCEPT_LANGUAGES_PREF = "intl.accept_languages";
const FIVE_LOCALES = "en,fr,de,es,ja";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

async function openLanguagesPane() {
  await openPreferencesViaOpenPreferencesAPI("paneLanguages", {
    leaveOpen: true,
  });
  return { win: gBrowser.contentWindow, tab: gBrowser.selectedTab };
}

add_task(async function test_reordering_languages_position_before() {
  await SpecialPowers.pushPrefEnv({
    set: [[ACCEPT_LANGUAGES_PREF, FIVE_LOCALES]],
  });

  let { win, tab } = await openLanguagesPane();

  let boxGroupControl = await settingControlRenders(
    "websiteLanguageWrapper",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder = "fr,de,en,es,ja";
  let prefChanged = TestUtils.waitForPrefChange(ACCEPT_LANGUAGES_PREF);

  // Simulate dragging "en" (index 0) before "es" (index 3).
  performDragAndDrop({
    contentWindow: win,
    dragItem: boxGroup.children[1].handleEl,
    targetItem: boxGroup.children[4],
    position: "before",
  });

  Assert.equal(await prefChanged, expectedOrder, "en should land before es");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_languages_position_after_from_end() {
  await SpecialPowers.pushPrefEnv({
    set: [[ACCEPT_LANGUAGES_PREF, FIVE_LOCALES]],
  });

  let { win, tab } = await openLanguagesPane();

  let boxGroupControl = await settingControlRenders(
    "websiteLanguageWrapper",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder = "en,fr,ja,de,es";
  let prefChanged = TestUtils.waitForPrefChange(ACCEPT_LANGUAGES_PREF);

  // Simulate dragging "ja" (index 4) after "fr" (index 1).
  performDragAndDrop({
    contentWindow: win,
    dragItem: boxGroup.children[5].handleEl,
    targetItem: boxGroup.children[2],
    position: "after",
  });

  Assert.equal(await prefChanged, expectedOrder, "ja should land after fr");

  await BrowserTestUtils.removeTab(tab);
});
