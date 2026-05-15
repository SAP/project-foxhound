/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

registerCleanupFunction(async () => {
  await TabNotes.reset();
});

add_task(async function test_tab_notes_data_preserved_on_adoption() {
  const url = "https://example.com/";
  const noteText = "test note text";
  let newWin = await BrowserTestUtils.openNewBrowserWindow();

  let notatedTab = BrowserTestUtils.addTab(gBrowser, url);
  await BrowserTestUtils.browserLoaded(notatedTab.linkedBrowser);
  await Promise.all([
    TabNotes.set(notatedTab, noteText),
    BrowserTestUtils.waitForEvent(notatedTab, "TabNote:Created"),
  ]);

  Assert.equal(
    notatedTab.canonicalUrl,
    url,
    "notated tab should have correct canonical URL"
  );
  Assert.ok(
    notatedTab.hasTabNote,
    "notated tab should indicate it has a tab note"
  );

  // Adopt the tab into the new window
  let adoptedTab = newWin.gBrowser.adoptTab(notatedTab);

  Assert.ok(adoptedTab, "adoptTab should succeed");
  Assert.equal(
    adoptedTab.canonicalUrl,
    url,
    "adopted tab should preserve the same canonical URL"
  );
  Assert.ok(
    adoptedTab.hasTabNote,
    "adopted tab should also indicate it has a tab note"
  );

  // Verify the original tab is gone (should be closed by adoptTab)
  ok(
    notatedTab.closing || !notatedTab.parentNode,
    "Original tab should be closed or removed"
  );

  // Clean up
  await BrowserTestUtils.closeWindow(newWin);
});
