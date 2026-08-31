/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

async function doAndWaitForOverflow(actionFn, conditionFn) {
  let overflowList = document.getElementById("widget-overflow-list");
  let promise = BrowserTestUtils.waitForMutationCondition(
    overflowList,
    { childList: true },
    conditionFn
  );
  let result = actionFn();
  await promise;
  return result;
}

/*
Tests that a non-removable XUL widget in the overflow list retains its
placement after a CustomizableUI reset.
*/
add_task(async function test_non_removable_overflow_reset() {
  let fxaButton = document.getElementById("fxa-toolbar-menu-button");
  fxaButton.setAttribute("removable", "false");
  let navbar = document.getElementById(CustomizableUI.AREA_NAVBAR);

  let originalWindowWidth = await doAndWaitForOverflow(
    () => ensureToolbarOverflow(window, false),
    () => navbar.overflowable.isInOverflowList(fxaButton)
  );

  let placementBeforeReset = CustomizableUI.getPlacementOfWidget(
    "fxa-toolbar-menu-button"
  );
  ok(
    placementBeforeReset,
    "getPlacementOfWidget should return a placement before reset"
  );

  await resetCustomization();

  let placement = CustomizableUI.getPlacementOfWidget(
    "fxa-toolbar-menu-button"
  );
  ok(placement, "getPlacementOfWidget should return a placement after reset");
  is(
    placement?.area,
    CustomizableUI.AREA_NAVBAR,
    "fxa button should still be placed in nav-bar after reset"
  );
  let defaultPlacements = CustomizableUI.getDefaultPlacementsForArea(
    CustomizableUI.AREA_NAVBAR
  );
  is(
    placement?.position,
    defaultPlacements.indexOf("fxa-toolbar-menu-button"),
    "fxa button should be at its default position after reset"
  );

  await doAndWaitForOverflow(
    () => unensureToolbarOverflow(window, originalWindowWidth),
    () => !navbar.overflowable.isInOverflowList(fxaButton)
  );
  fxaButton.setAttribute("removable", "true");
});
