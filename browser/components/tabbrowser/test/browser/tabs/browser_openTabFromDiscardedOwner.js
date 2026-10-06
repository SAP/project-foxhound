/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function () {
  const win = await BrowserTestUtils.openNewBrowserWindow();

  const discardedOwnerTab = BrowserTestUtils.addTab(win.gBrowser, "", {
    createLazyBrowser: true,
  });
  const childTab = BrowserTestUtils.addTab(win.gBrowser, "about:blank", {
    ownerTab: discardedOwnerTab,
    openerBrowser: discardedOwnerTab.linkedBrowser,
  });

  ok(
    childTab,
    "child tab is successfully opened as a child of a discarded owner"
  );

  await BrowserTestUtils.closeWindow(win);
});
