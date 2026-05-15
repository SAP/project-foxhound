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
