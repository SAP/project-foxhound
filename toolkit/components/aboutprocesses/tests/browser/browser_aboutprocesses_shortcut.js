/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function () {
  // Wait for the browser to be ready to receive keyboard events.
  if (!gBrowser.selectedBrowser.hasLayers) {
    await BrowserTestUtils.waitForEvent(window, "MozLayerTreeReady");
  }

  // Allow the initial about:blank to settle.
  await new Promise(resolve => setTimeout(resolve, 0));

  EventUtils.synthesizeKey("KEY_Escape", { shiftKey: true });

  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  Assert.equal(gBrowser.selectedBrowser.currentURI.spec, "about:processes");
});
