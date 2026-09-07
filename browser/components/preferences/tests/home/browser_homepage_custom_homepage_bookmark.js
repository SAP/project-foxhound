/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_replace_with_bookmark() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, "https://example.com|https://test.org"]],
  });

  // Use a URL with a path to avoid Places normalizing it by appending a
  // trailing slash (e.g. "https://mozilla.org" -> "https://mozilla.org/"),
  // which would break the exact equality pref check below.
  const BOOKMARK_URL = "https://example.org/test-bookmark";

  let bm = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.menuGuid,
    title: "Test Bookmark",
    url: BOOKMARK_URL,
  });
  registerCleanupFunction(() => PlacesUtils.bookmarks.remove(bm.guid));

  let { win, tab } = await openCustomHomepageSubpage();

  let replaceButtonControl = await settingControlRenders(
    "customHomepageReplaceWithBookmarksButton",
    win
  );
  let replaceButton = replaceButtonControl.controlEl;

  let promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/preferences/dialogs/selectBookmark.xhtml"
  );

  replaceButton.click();

  let dialog = await promiseSubDialogLoaded;

  let bookmarksTree = dialog.document.getElementById("bookmarks");
  await TestUtils.waitForCondition(
    () => bookmarksTree.view?.rowCount > 0,
    "Bookmarks tree populated"
  );
  bookmarksTree.selectItems([bm.guid]);

  dialog.document
    .getElementById("selectBookmarkDialog")
    .getButton("accept")
    .click();

  await TestUtils.waitForCondition(
    () => Services.prefs.getStringPref(HOMEPAGE_PREF) === BOOKMARK_URL,
    "Pref replaced with bookmark URL"
  );

  ok(
    !Services.prefs
      .getStringPref(HOMEPAGE_PREF)
      .includes("https://example.com"),
    "Previous URLs were replaced, not appended to"
  );

  await BrowserTestUtils.removeTab(tab);
});
