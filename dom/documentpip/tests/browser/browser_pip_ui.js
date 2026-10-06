/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { UrlbarTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlbarTestUtils.sys.mjs"
);

// The following tests can reuse the same PiP window
let tab, chromePiP;
add_setup(async function open_pip() {
  [tab, chromePiP] = await newTabWithPiP();
});
registerCleanupFunction(async function close_pip() {
  await BrowserTestUtils.closeWindow(chromePiP);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function pip_urlbar_shows_readonly_opener_url() {
  // correct URL at the beginning
  const expectedURL = UrlbarTestUtils.trimURL(
    tab.linkedBrowser.currentURI.spec
  );
  is(chromePiP.gURLBar.value, expectedURL, "PiP urlbar shows opener url");
  ok(chromePiP.gURLBar.readOnly, "Location bar is read-only in PiP");

  // correct URL after PiP location change
  const onLocationChange = BrowserTestUtils.waitForLocationChange(
    chromePiP.gBrowser,
    "about:blank#0"
  );
  await SpecialPowers.spawn(chromePiP.gBrowser.selectedBrowser, [], () => {
    content.location.href = "about:blank#0";
  });
  await onLocationChange;
  is(chromePiP.gURLBar.value, expectedURL, "PiP urlbar shows opener url");
});

add_task(async function pip_alwaysontop_chromeFlag() {
  // Currently, we cannot check the widget is actually alwaysontop. But we can check
  // that the respective chromeFlag is set.
  const chromeFlags = chromePiP.docShell.treeOwner
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIAppWindow).chromeFlags;
  ok(
    chromeFlags & Ci.nsIWebBrowserChrome.CHROME_ALWAYS_ON_TOP,
    "PiP has alwaysontop chrome flag"
  );
});

const isVisible = el => el.checkVisibility();

add_task(async function pip_ui_buttons() {
  let buttons = Array.from(
    chromePiP.document.querySelectorAll("button, toolbarbutton, [role=button]")
  ).filter(isVisible);

  // TabsToolbar is collapsed to zero width but elements count as visible
  const tabsToolbar = chromePiP.document.getElementById("TabsToolbar");
  buttons = buttons.filter(btn => !tabsToolbar.contains(btn));

  // Document Picture-in-Picture is an always-on-top popup. These are the
  // UI buttons we expect to be shown. When introducing new buttons and
  // this test fails, implementers should consider whether it makes
  // sense to show this button for this kind of window.
  const expectedButtons = [
    "trust-icon-container",
    "document-pip-return-to-opener-button",
  ];

  buttons.forEach(btn => {
    const idx = expectedButtons.indexOf(btn.id);
    Assert.greater(
      idx,
      -1,
      `Expected '${btn.id}' to be ${idx > 0 ? "" : "not"} be visible for PiP`
    );
    expectedButtons.splice(idx, 1);
  });

  Assert.deepEqual(expectedButtons, [], "Expected buttons to be visible");
});

add_task(async function pip_reload_disabled() {
  const reloadCommand = chromePiP.document.getElementById("Browser:Reload");
  ok(reloadCommand.hasAttribute("disabled"), "Reload command is disabled");

  // F5 should be a no-op rather than auto-closing the PiP due to navigation
  EventUtils.synthesizeKey("VK_F5", {}, chromePiP);

  const pipClosed = await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    return content.documentPictureInPicture.window?.closed;
  });
  ok(!pipClosed, "F5 should not close the PiP");
});

add_task(async function pip_bookmark_disabled() {
  const bookmarkCommand = chromePiP.document.getElementById(
    "Browser:AddBookmarkAs"
  );
  ok(bookmarkCommand.hasAttribute("disabled"), "Bookmark command is disabled");
});

async function withContextMenu(browser, fn) {
  const win = browser.documentGlobal;
  const contextMenu = win.document.getElementById("contentAreaContextMenu");
  const popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  BrowserTestUtils.synthesizeMouse(
    null,
    0,
    0,
    { type: "contextmenu" },
    browser
  );
  await popupShown;
  await fn(win.document);
  const popupHidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await popupHidden;
}

add_task(async function pip_context_menu_items_hidden() {
  const ids = [
    "context-back",
    "context-forward",
    "context-reload",
    "context-bookmarkpage",
    "context-viewsource",
    "context-ask-chat",
  ];

  await withContextMenu(tab.linkedBrowser, doc => {
    for (const id of ids) {
      ok(isVisible(doc.getElementById(id)), `Sanity: ${id} is visible in tab`);
    }
  });

  await withContextMenu(chromePiP.gBrowser.selectedBrowser, doc => {
    for (const id of ids) {
      ok(!isVisible(doc.getElementById(id)), `${id} is not visible in PiP`);
    }
  });
});
