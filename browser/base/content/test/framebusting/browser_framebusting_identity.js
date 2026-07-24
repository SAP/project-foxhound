/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.disable_open_during_load", true],
      ["dom.security.framebusting_intervention.enabled", true],
      ["dom.disable_open_click_delay", 0],
    ],
  });
});

add_task(async function () {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  await triggerFramebustingIntervention(tab);
  await openIdentityPopup();

  // Run actual checks.
  await checkLocalization();
  await checkGoToRedirect(tab);

  info("Cleaning up...");
  await closeIdentityPopup();
  BrowserTestUtils.removeTab(tab);
});

async function openIdentityPopup() {
  info("Waiting for box...");
  await TestUtils.waitForCondition(() =>
    gPermissionPanel._identityPermissionBox.checkVisibility()
  );

  info("Clicking button...");
  const promise = BrowserTestUtils.waitForEvent(
    window,
    "popupshown",
    true,
    event => event.target == gPermissionPanel._permissionPopup
  );
  gPermissionPanel._identityPermissionBox.click();

  info("Waiting for popup to show...");
  await promise;
}

async function closeIdentityPopup() {
  info("Hiding identity popup...");
  const promise = BrowserTestUtils.waitForEvent(
    gPermissionPanel._permissionPopup,
    "popuphidden"
  );
  gPermissionPanel._permissionPopup.hidePopup();

  info("Waiting for popup to hide...");
  await promise;
}

async function checkLocalization() {
  const indicatorItem = document.getElementById("blocked-popup-indicator-item");
  is(indicatorItem.children.length, 1, "Indicator item has exactly one child");

  is(
    indicatorItem.children[0].dataset.l10nId,
    "site-permissions-unblock-redirect"
  );
}

async function checkGoToRedirect(tab) {
  const indicatorItem = document.getElementById("blocked-popup-indicator-item");
  is(indicatorItem.children.length, 1, "Indicator item has exactly one child");

  info("Going to blocked redirect...");
  indicatorItem.children[0].click();
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /*includeSubFrames=*/ false,
    FRAMEBUSTING_FRAME_URL
  );

  info("Resetting to initial state...");
  await triggerFramebustingIntervention(tab);
  await openIdentityPopup();
}
