/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { PermissionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PermissionTestUtils.sys.mjs"
);

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
  await openSettingsPopup();

  info("Checking notification l10n...");
  const notification = gBrowser
    .getNotificationBox()
    .getNotificationWithValue("popup-blocked");
  is(
    notification.messageL10nId,
    "redirect-warning-with-popup-message",
    "Notification message is correct"
  );

  // Run actual checks.
  await checkLocalization();
  await checkToolbarAllowSite(tab);
  await checkToolbarManageSettings();
  await checkToolbarDontShow(tab);
  await checkToolbarRedirect(tab);

  info("Cleaning up...");
  await closeSettingsPopup();
  BrowserTestUtils.removeTab(tab);
});

async function openSettingsPopup() {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");

  // Close a still open one beforehand.
  if (blockedPopupOptions.state === "open") {
    await closeSettingsPopup();
  }

  info("Waiting for notification...");
  let notification;
  await TestUtils.waitForCondition(
    () =>
      (notification = gBrowser
        .getNotificationBox()
        .getNotificationWithValue("popup-blocked"))
  );

  info("Clicking button...");
  const promise = BrowserTestUtils.waitForEvent(
    window,
    "popupshown",
    true,
    event => event.target == blockedPopupOptions
  );
  notification._buttons[0].click();

  info("Waiting for toolbar to show...");
  await promise;
}

async function closeSettingsPopup() {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");

  info("Hiding settings popup...");
  const promise = BrowserTestUtils.waitForEvent(
    blockedPopupOptions,
    "popuphidden"
  );
  blockedPopupOptions.hidePopup();

  info("Waiting for popup to hide...");
  await promise;
}

async function checkLocalization() {
  const expectedProperties = [
    {
      idx: 0,
      dataset: {
        l10nId: "popups-infobar-allow2",
        l10nArgs: JSON.stringify({
          uriHost: new URL(FRAMEBUSTING_PARENT_URL).host,
        }),
      },
    },
    { idx: 1, dataset: { l10nId: "edit-popup-settings2" } },
    {
      idx: 2,
      dataset: { l10nId: "popups-infobar-dont-show-message2" },
    },
    { idx: 3, hidden: false },
    {
      idx: 4,
      dataset: {
        l10nId: "popup-trigger-redirect-menuitem",
        l10nArgs: JSON.stringify({ redirectURI: FRAMEBUSTING_FRAME_URL }),
      },
    },
    { idx: 5, hidden: true },
  ];

  const blockedPopupOptions = document.getElementById("blockedPopupOptions");
  is(blockedPopupOptions.children.length, expectedProperties.length);

  for (const { idx, ...properties } of expectedProperties) {
    const element = blockedPopupOptions.children[idx];
    for (const [key, value] of Object.entries(properties)) {
      Assert.deepEqual(element[key], value);
    }
  }
}

async function checkToolbarAllowSite(tab) {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");
  const allowSiteItem = blockedPopupOptions.children[0];

  info("Clicking allow site item...");
  allowSiteItem.click();

  info("Waiting to be redirected...");
  await BrowserTestUtils.waitForLocationChange(
    gBrowser,
    FRAMEBUSTING_FRAME_URL
  );

  info("Checking permission...");
  is(
    PermissionTestUtils.testPermission(FRAMEBUSTING_PARENT_URL, "popup"),
    Services.perms.ALLOW_ACTION,
    "popup permissions is allow"
  );

  info("Triggering framebusting intervention...");
  await triggerFramebustingIntervention(tab);

  // uh oh - busted!
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /*includeSubframes=*/ false,
    FRAMEBUSTING_FRAME_URL
  );

  info("Removing permission...");
  PermissionTestUtils.remove(FRAMEBUSTING_PARENT_URL, "popup");

  info("Resetting to initial state...");
  await triggerFramebustingIntervention(tab);
  await openSettingsPopup();
}

async function checkToolbarManageSettings() {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");
  const manageSettingsItem = blockedPopupOptions.children[1];

  const promise = BrowserTestUtils.waitForLocationChange(
    gBrowser,
    "about:preferences#privacy"
  );

  info("Clicking manage settings item...");
  manageSettingsItem.click();

  info("Waiting for navigation...");
  await promise;

  info("Closing new tab...");
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
}

async function checkToolbarDontShow(tab) {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");
  const dontShowItem = blockedPopupOptions.children[2];

  info("Clicking don't show item...");
  dontShowItem.click();

  info("Checking prefs...");
  is(Services.prefs.getBoolPref("privacy.popups.showBrowserMessage"), false);

  info("Resetting prefs...");
  Services.prefs.setBoolPref("privacy.popups.showBrowserMessage", true);

  info("Resetting to initial state...");
  await triggerFramebustingIntervention(tab);
  await openSettingsPopup();
}

async function checkToolbarRedirect(tab) {
  const blockedPopupOptions = document.getElementById("blockedPopupOptions");
  const redirectItem = blockedPopupOptions.children[4];

  info("Clicking redirect item...");
  redirectItem.click();

  info("Waiting to be redirected...");
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /*includeSubFrames=*/ false,
    FRAMEBUSTING_FRAME_URL
  );

  info("Resetting to initial state...");
  await triggerFramebustingIntervention(tab);
  await openSettingsPopup();
}
