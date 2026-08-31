/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const WIDGET_ID = "search-container";

async function assertBreakout(enabled, message) {
  // Wait until urlbar code to set the attributes.
  await window.promiseDocumentFlushed(() => {});
  await new Promise(r => window.requestAnimationFrame(r));
  // Make sure the urlbar callbacks run first.
  await new Promise(r => setTimeout(r, 0));

  let searchbar = document.querySelector("#searchbar-new");
  if (enabled) {
    Assert.ok(searchbar.hasAttribute("breakout"), message + ": breakout on");
    Assert.ok(searchbar.matches(":popover-open"), message + ": popover on");
  } else {
    Assert.ok(!searchbar.hasAttribute("breakout"), message + ": breakout off");
    Assert.ok(!searchbar.matches(":popover-open"), message + ": popover off");
  }
}

add_task(async function test_breakout() {
  await assertBreakout(true, "Enabled in navbar");

  CustomizableUI.removeWidgetFromArea(WIDGET_ID);
  await startCustomizing();
  await assertBreakout(false, "Disabled in palette");

  CustomizableUI.addWidgetToArea(WIDGET_ID, CustomizableUI.AREA_NAVBAR);
  await assertBreakout(false, "Disabled in navbar while customizing");

  CustomizableUI.removeWidgetFromArea(WIDGET_ID);
  await assertBreakout(false, "Disabled in palette");

  CustomizableUI.addWidgetToArea(WIDGET_ID, CustomizableUI.AREA_NAVBAR);
  await endCustomizing();
  await assertBreakout(true, "Enabled in navbar after customizing");
});
