/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function check_chrome_window_has_pip_flag() {
  const [tab, chromePiP] = await newTabWithPiP();

  is(
    chromePiP.location.href,
    "chrome://browser/content/browser.xhtml",
    "Got the chrome window of the PiP"
  );
  ok(chromePiP.browsingContext.isDocumentPiP, "Chrome window has pip flag set");

  // Cleanup.
  await BrowserTestUtils.closeWindow(chromePiP);
  BrowserTestUtils.removeTab(tab);
});
