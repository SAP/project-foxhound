/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Check that menubar visibility is propagated correctly to new windows.
 */
add_task(async function test_menubar_visbility() {
  let menubar = document.getElementById("toolbar-menubar");
  ok(menubar.hasAttribute("autohide"), "Menubar should be autohiding");
  registerCleanupFunction(() => {
    Services.xulStore.removeValue(
      AppConstants.BROWSER_CHROME_URL,
      menubar.id,
      "autohide"
    );
    menubar.setAttribute("autohide", "true");
  });

  let contextMenu = document.getElementById("toolbar-context-menu");
  let shownPromise = popupShown(contextMenu);
  EventUtils.synthesizeMouse(
    document.getElementById("stop-reload-button"),
    2,
    2,
    {
      type: "contextmenu",
      button: 2,
    }
  );
  await shownPromise;
  let attrChanged = BrowserTestUtils.waitForAttributeRemoval(
    "autohide",
    menubar
  );
  EventUtils.synthesizeMouseAtCenter(
    document.getElementById("toggle_toolbar-menubar"),
    {}
  );
  await attrChanged;
  contextMenu.hidePopup(); // to be safe.

  ok(
    !menubar.hasAttribute("autohide"),
    "Menubar should now be permanently visible."
  );
  let persistedValue = Services.xulStore.getValue(
    AppConstants.BROWSER_CHROME_URL,
    menubar.id,
    "autohide"
  );
  is(persistedValue, "-moz-missing\n", "New value should be persisted");

  let win = await BrowserTestUtils.openNewBrowserWindow();

  ok(
    !win.document.getElementById("toolbar-menubar").hasAttribute("autohide"),
    "Menubar should also be permanently visible in the new window."
  );

  await BrowserTestUtils.closeWindow(win);
});
