/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { ObjectUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ObjectUtils.sys.mjs"
);

const TAB_URL = "about:robots";

async function addTab(url = TAB_URL) {
  const tab = BrowserTestUtils.addTab(gBrowser, url, {
    skipAnimation: true,
  });
  const browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);
  return tab;
}

async function openContextMenu(tab) {
  let contextMenu = document.getElementById("tabContextMenu");
  let openTabContextMenuPromise = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "shown"
  );

  await sendAndWaitForMouseEvent(tab, { type: "contextmenu" });
  await openTabContextMenuPromise;
  return contextMenu;
}

async function openMoveTabOptionsMenuPopup(contextMenu) {
  let moveTabMenuItem = contextMenu.querySelector("#context_moveTabOptions");
  let subMenu = contextMenu.querySelector("#moveTabOptionsMenu");
  let popupShown = BrowserTestUtils.waitForEvent(subMenu, "popupshown");

  if (AppConstants.platform === "macosx") {
    moveTabMenuItem.openMenu(true);
  } else {
    await sendAndWaitForMouseEvent(moveTabMenuItem);
  }

  await popupShown;

  const separator = subMenu.querySelector("#moveTabSeparator");
  await TestUtils.waitForCondition(
    () =>
      BrowserTestUtils.isVisible(separator) &&
      BrowserTestUtils.isVisible(separator.nextElementSibling)
  );

  return subMenu;
}

async function clickMoveToProfileMenuItem(subMenu) {
  let profileMenuItem = subMenu.querySelector(":scope > menuitem[profileid]");
  if (AppConstants.platform === "macosx") {
    subMenu.activateItem(profileMenuItem);
  } else {
    await sendAndWaitForMouseEvent(profileMenuItem);
  }
}

async function sendAndWaitForMouseEvent(target, options = {}) {
  let promise = BrowserTestUtils.waitForEvent(target, options.type ?? "click");
  EventUtils.synthesizeMouseAtCenter(target, options);
  return promise;
}

const execProcess = sinon.fake();
const sendCommandLine = sinon.fake.throws(Cr.NS_ERROR_NOT_AVAILABLE);
sinon.replace(
  SelectableProfileService,
  "sendCommandLine",
  (path, args, raise) => sendCommandLine(path, [...args], raise)
);
sinon.replace(SelectableProfileService, "execProcess", execProcess);

registerCleanupFunction(() => {
  sinon.restore();
});

let lastCommandLineCallCount = 1;
async function assertCommandLineExists(expected) {
  await TestUtils.waitForCondition(
    () => sendCommandLine.callCount > lastCommandLineCallCount,
    "Waiting for notify task to complete"
  );

  let allCommandLineCalls = sendCommandLine.getCalls();

  lastCommandLineCallCount++;

  let expectedCount = allCommandLineCalls.reduce((count, call) => {
    if (ObjectUtils.deepEqual(call.args, expected)) {
      return count + 1;
    }

    return count;
  }, 0);

  Assert.equal(expectedCount, 1, "Found expected args");
  Assert.deepEqual(
    allCommandLineCalls.find(call => ObjectUtils.deepEqual(call.args, expected))
      .args,
    expected,
    "Expected sendCommandLine arguments to open tab in profile"
  );
}

add_task(async function test_moveSelectedTab() {
  await initGroupDatabase();

  const allProfiles = await SelectableProfileService.getAllProfiles();
  let otherProfile;
  if (allProfiles.length < 2) {
    otherProfile = await SelectableProfileService.createNewProfile(false);
  } else {
    otherProfile = allProfiles.find(
      p => p.id !== SelectableProfileService.currentProfile.id
    );
  }

  const url = TAB_URL + "#2";
  let tab2 = await addTab(url);

  gBrowser.selectedTab = tab2;

  let contextMenu = await openContextMenu(tab2);
  let subMenu = await openMoveTabOptionsMenuPopup(contextMenu);
  await clickMoveToProfileMenuItem(subMenu);

  let expectedArgs = ["-new-tab", url];

  await assertCommandLineExists([otherProfile.path, expectedArgs, true]);

  gBrowser.removeTab(tab2);
});

add_task(async function test_moveNonSelectedTab() {
  await initGroupDatabase();

  const allProfiles = await SelectableProfileService.getAllProfiles();
  let otherProfile;
  if (allProfiles.length < 2) {
    otherProfile = await SelectableProfileService.createNewProfile(false);
  } else {
    otherProfile = allProfiles.find(
      p => p.id !== SelectableProfileService.currentProfile.id
    );
  }

  const url2 = TAB_URL + "#2";
  const url3 = TAB_URL + "#3";
  let tab2 = await addTab(url2);
  let tab3 = await addTab(url3);

  gBrowser.selectedTab = tab2;

  let contextMenu = await openContextMenu(tab3);
  let subMenu = await openMoveTabOptionsMenuPopup(contextMenu);
  await clickMoveToProfileMenuItem(subMenu);

  let expectedArgs = ["-new-tab", url3];

  await assertCommandLineExists([otherProfile.path, expectedArgs, true]);

  gBrowser.removeTabs([tab2, tab3]);
});

add_task(async function test_moveMultipleSelectedTabs() {
  await initGroupDatabase();

  const allProfiles = await SelectableProfileService.getAllProfiles();
  let otherProfile;
  if (allProfiles.length < 2) {
    otherProfile = await SelectableProfileService.createNewProfile(false);
  } else {
    otherProfile = allProfiles.find(
      p => p.id !== SelectableProfileService.currentProfile.id
    );
  }

  const url2 = TAB_URL + "#2";
  const url3 = TAB_URL + "#3";
  const url4 = TAB_URL + "#4";
  let tab2 = await addTab(url2);
  let tab3 = await addTab(url3);
  let tab4 = await addTab(url4);

  gBrowser.selectedTab = tab2;

  await sendAndWaitForMouseEvent(tab2);
  if (AppConstants.platform === "macosx") {
    await sendAndWaitForMouseEvent(tab3, { metaKey: true });
    await sendAndWaitForMouseEvent(tab4, { metaKey: true });
  } else {
    await sendAndWaitForMouseEvent(tab3, { ctrlKey: true });
    await sendAndWaitForMouseEvent(tab4, { ctrlKey: true });
  }

  Assert.ok(tab2.multiselected, "Tab2 is multiselected");
  Assert.ok(tab3.multiselected, "Tab3 is multiselected");
  Assert.ok(tab4.multiselected, "Tab4 is multiselected");

  let contextMenu = await openContextMenu(tab4);
  let subMenu = await openMoveTabOptionsMenuPopup(contextMenu);
  await clickMoveToProfileMenuItem(subMenu);

  let expectedArgs = ["-new-tab", url2, "-new-tab", url3, "-new-tab", url4];

  await assertCommandLineExists([otherProfile.path, expectedArgs, true]);

  gBrowser.removeTabs([tab2, tab3, tab4]);
});
