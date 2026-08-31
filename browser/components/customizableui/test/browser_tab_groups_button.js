/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TAB_GROUPS_BUTTON_ID = "tab-groups-button";

add_setup(() => {
  CustomizableUI.reset();
});

registerCleanupFunction(() => {
  CustomizableUI.reset();
});

add_task(async function test_is_removable() {
  Assert.ok(
    CustomizableUI.isWidgetRemovable(TAB_GROUPS_BUTTON_ID),
    "The tab groups button should be removable"
  );
});

add_task(async function test_can_be_added_to_area() {
  CustomizableUI.addWidgetToArea(
    TAB_GROUPS_BUTTON_ID,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );
  Assert.equal(
    CustomizableUI.getPlacementOfWidget(TAB_GROUPS_BUTTON_ID).area,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
    "Tab groups button should be in the overflow area"
  );
  CustomizableUI.reset();
});

add_task(async function test_panel_contents() {
  CustomizableUI.addWidgetToArea(
    TAB_GROUPS_BUTTON_ID,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );
  await waitForOverflowButtonShown();
  await document.getElementById("nav-bar").overflowable.show();

  const button = document.getElementById(TAB_GROUPS_BUTTON_ID);
  Assert.ok(button, "Tab group button appears in Panel Menu");
  button.click();

  let view = document.getElementById("toolbar-tabGroupsListView");
  await BrowserTestUtils.waitForEvent(view, "ViewShown");

  let header = view.querySelector(".panel-header");
  Assert.ok(header, "toolbar menu has a header");
  Assert.equal(
    header.querySelector("span").textContent,
    "Tab groups",
    "toolbar menu should be titled 'Tab groups'"
  );
  Assert.ok(
    view.querySelector("tab-groups-list"),
    "toolbar menu has a tab groups list component"
  );

  let viewPanel = view.closest("panel");
  let panelHidden = BrowserTestUtils.waitForPopupEvent(viewPanel, "hidden");
  viewPanel.hidePopup();
  await panelHidden;

  if (isOverflowOpen()) {
    await hideOverflow();
  }
});
