/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

registerCleanupFunction(() => TabNotes.reset());

/**
 * @param {MozTabbrowserTab} tab
 * @param {string} startingUrl
 * @param {boolean} startsWithTabNote
 * @param {string} destinationUrl
 * @param {boolean} destinationHasTabNote
 */
async function navigateAndReturn(
  tab,
  startingUrl,
  startsWithTabNote,
  destinationUrl,
  destinationHasTabNote
) {
  let waitForNote = tabNoteDeterminedFullPageLoad(tab);
  await BrowserTestUtils.loadURIString({
    browser: tab.linkedBrowser,
    uriString: destinationUrl,
  });
  let hasTabNote = await waitForNote;
  Assert.equal(
    hasTabNote,
    destinationHasTabNote,
    "tab has expected tab note state after navigation"
  );

  let locationChange = BrowserTestUtils.waitForLocationChange(
    gBrowser,
    startingUrl
  );
  tab.linkedBrowser.goBack();
  [hasTabNote] = await Promise.all([tabNoteDetermined(tab), locationChange]);
  Assert.equal(
    hasTabNote,
    startsWithTabNote,
    "tab returns to its original tab note state after going back"
  );
}

add_task(async function test_navigate() {
  const urlWithNote1 = "https://www.example.com/?with-note-1";
  const urlWithNote2 = "https://www.example.com/?with-note-2";
  const urlWithoutNote1 = "https://www.example.com/?without-note-1";
  const urlWithoutNote2 = "https://www.example.com/?without-note-2";

  info("create tabs");
  const [tab1, tab2, tab3, tab4] = await Promise.all(
    [urlWithNote1, urlWithNote2, urlWithoutNote1, urlWithoutNote2].map(addTab)
  );

  info("set tab notes on tabs 1 and 2");
  await Promise.all([tab1, tab2].map(createNote));

  Assert.ok(tab1.hasTabNote, "tab1 indicates it has a tab note");
  Assert.ok(tab2.hasTabNote, "tab2 indicates it has a tab note");
  Assert.ok(!tab3.hasTabNote, "tab3 indicates it does not have a tab note");
  Assert.ok(!tab4.hasTabNote, "tab4 indicates it does not have a tab note");

  info("page with note -> another page with note ↩️");
  await navigateAndReturn(tab1, urlWithNote1, true, urlWithNote2, true);

  info("page with note -> page without note ↩️");
  await navigateAndReturn(tab2, urlWithNote2, true, urlWithoutNote1, false);

  info("page without note -> page with note ↩️");
  await navigateAndReturn(tab3, urlWithoutNote1, false, urlWithNote1, true);

  info("page without note -> another page without note ↩️");
  await navigateAndReturn(tab4, urlWithoutNote2, false, urlWithoutNote1, false);

  for (const tab of [tab1, tab2, tab3, tab4]) {
    BrowserTestUtils.removeTab(tab);
  }
});
