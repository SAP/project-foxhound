/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function resetTelemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

add_setup(async function () {
  await resetTelemetry();

  const previous = PlacesUIUtils.shouldShowTabsFromOtherComputersMenuitem;

  registerCleanupFunction(async () => {
    PlacesUIUtils.shouldShowTabsFromOtherComputersMenuitem = previous;
  });

  PlacesUIUtils.shouldShowTabsFromOtherComputersMenuitem = () => true;
});

registerCleanupFunction(async () => {
  await resetTelemetry();
});

add_task(async function tab_manager_synced_tabs() {
  let win = await BrowserTestUtils.openNewBrowserWindow();
  win.gTabsPanel.init();
  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.tabs_from_devices.testGetValue(),
    undefined,
    "interaction count for tabs from other devices starts unset"
  );

  let button = win.document.getElementById("alltabs-button");
  let allTabsView = win.document.getElementById("allTabsMenu-allTabsView");
  let allTabsPopupShownPromise = BrowserTestUtils.waitForEvent(
    allTabsView,
    "ViewShown"
  );
  button.click();
  await allTabsPopupShownPromise;

  let syncedTabsButton = allTabsView.querySelector("#allTabsMenu-syncedTabs");
  is(syncedTabsButton.checkVisibility(), true, "item is visible");

  let sidebarShown = BrowserTestUtils.waitForEvent(win, "SidebarShown");
  syncedTabsButton.click();
  info("Waiting for sidebar to open");
  await sidebarShown;

  is(win.SidebarController.isOpen, true, "Sidebar is open");
  is(
    win.SidebarController.currentID,
    "viewTabsSidebar",
    "Synced tabs side bar is being displayed"
  );

  await BrowserTestUtils.waitForCondition(() => {
    return (
      Glean.browserUiInteraction.listAllTabsAction.tabs_from_devices.testGetValue() ==
      1
    );
  }, "Wait for metric to increment");
  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.tabs_from_devices.testGetValue(),
    1,
    "interaction count for tabs from other devices should be 1 after clicking on the menu item"
  );

  await BrowserTestUtils.closeWindow(win);
});
