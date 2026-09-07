/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_sharingDisabledInPrivateWindows() {
  let win = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  ok(
    !win.ContentSharingUtils.isEnabled,
    "Should be disabled in a private browsing window"
  );

  await BrowserTestUtils.closeWindow(win);
});
