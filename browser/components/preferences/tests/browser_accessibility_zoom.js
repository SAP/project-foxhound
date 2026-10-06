/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function openAccessibilityPane() {
  await openPreferencesViaOpenPreferencesAPI("accessibility", {
    leaveOpen: true,
  });
  return gBrowser.selectedBrowser.contentDocument;
}

add_task(async function test_zoom_dropdown_populated() {
  let doc = await openAccessibilityPane();
  let zoomGroup = doc.querySelector('setting-group[groupid="zoom"]');
  ok(zoomGroup, "zoom setting-group exists");

  let mozSelect = zoomGroup.querySelector("#defaultZoom");
  ok(mozSelect, "defaultZoom moz-select exists");

  await BrowserTestUtils.waitForMutationCondition(
    mozSelect,
    { childList: true, subtree: true },
    () => mozSelect.inputEl?.options.length > 0
  );

  let options = Array.from(mozSelect.inputEl.options);
  Assert.greater(options.length, 5, "Zoom dropdown has more than 5 options");
  ok(
    options.some(o => o.value === "100"),
    "100% option exists in zoom dropdown"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_zoom_dropdown_reflects_current_zoom() {
  let doc = await openAccessibilityPane();
  let zoomGroup = doc.querySelector('setting-group[groupid="zoom"]');
  let mozSelect = zoomGroup.querySelector("#defaultZoom");

  await BrowserTestUtils.waitForMutationCondition(
    mozSelect,
    { childList: true, subtree: true },
    () => mozSelect.inputEl?.options.length > 0
  );

  let ZoomUI = gBrowser.documentGlobal.ZoomUI;
  let currentZoom = await ZoomUI.getGlobalValue();
  let expectedValue = String(Math.round(currentZoom * 100));

  is(
    mozSelect.value,
    expectedValue,
    "Zoom dropdown value matches current global zoom"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function test_zoom_dropdown_has_valid_selected_option() {
  let doc = await openAccessibilityPane();
  let zoomGroup = doc.querySelector('setting-group[groupid="zoom"]');
  let mozSelect = zoomGroup.querySelector("#defaultZoom");

  await BrowserTestUtils.waitForMutationCondition(
    mozSelect,
    { childList: true, subtree: true },
    () => mozSelect.inputEl?.options.length > 0
  );

  Assert.greaterOrEqual(
    mozSelect.selectedIndex,
    0,
    "A zoom option is selected"
  );
  ok(/^\d+$/.test(mozSelect.value), "Zoom value is a numeric string");
  let zoomInt = parseInt(mozSelect.value, 10);
  Assert.greaterOrEqual(zoomInt, 30, `Zoom value ${zoomInt} is at least 30`);
  Assert.lessOrEqual(zoomInt, 500, `Zoom value ${zoomInt} is at most 500`);

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
