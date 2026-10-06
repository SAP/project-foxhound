/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

registerCleanupFunction(() => TabNotes.reset());

add_task(async function test_history_pushstate() {
  const urlWithNote = "https://www.example.com/?with-note";
  const urlWithoutNote = "https://www.example.com/?without-note";

  const tab = await addTab(urlWithNote);
  await createNote(tab);

  Assert.ok(tab.hasTabNote, "tab indicates it has a tab note");

  info("Navigate via pushState");
  let locationChange = BrowserTestUtils.waitForLocationChange(
    gBrowser,
    urlWithoutNote
  );
  let pushState = SpecialPowers.spawn(
    tab.linkedBrowser,
    [urlWithoutNote],
    url => {
      content.history.pushState({}, undefined, url);
    }
  );

  let hasTabNote = await pushState
    .then(() => locationChange)
    .then(() => tabNoteDetermined(tab));

  Assert.ok(
    !hasTabNote,
    "tab should no longer have a note after navigating to a URL without a note"
  );

  info("Go back to previous state");
  locationChange = BrowserTestUtils.waitForLocationChange(
    gBrowser,
    urlWithNote
  );
  let goBack = SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.history.back();
  });

  hasTabNote = await goBack
    .then(() => locationChange)
    .then(() => tabNoteDetermined(tab));

  Assert.ok(
    hasTabNote,
    "tab should have a note again after returning to the original URL with a note"
  );

  BrowserTestUtils.removeTab(tab);
});
