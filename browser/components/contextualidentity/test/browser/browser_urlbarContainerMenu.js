"use strict";

// Tests the container indicator context menu in the URL bar.

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
    while (gBrowser.tabs.length > 1) {
      BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
    }
  });
});

function openContainerTab(userContextId) {
  let tab = BrowserTestUtils.addTab(gBrowser, "about:blank", {
    userContextId,
    waitForLoad: false,
  });
  gBrowser.selectedTab = tab;
  return tab;
}

async function openContainerIndicatorMenu() {
  let iconsBox = document.getElementById("userContext-icons");
  let contextMenu = document.getElementById("userContext-indicator-menu");
  let popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(iconsBox, {});
  await popupShown;
  return contextMenu;
}

add_task(async function test_indicator_hidden_outside_container() {
  let iconsBox = document.getElementById("userContext-icons");
  ok(iconsBox.hidden, "Container indicator is hidden on a regular tab");
});

add_task(async function test_indicator_visible_in_container_tab() {
  let tab = openContainerTab(1);

  let iconsBox = document.getElementById("userContext-icons");
  ok(!iconsBox.hidden, "Container indicator is visible in a container tab");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_context_menu_structure() {
  let tab = openContainerTab(1);

  let contextMenu = await openContainerIndicatorMenu();

  let manageItem = contextMenu.querySelector(
    "[data-l10n-id='user-context-manage-containers']"
  );
  ok(manageItem, "Manage Containers item exists");
  ok(!manageItem.hidden, "Manage Containers item is visible");

  contextMenu.hidePopup();
  BrowserTestUtils.removeTab(tab);
});
