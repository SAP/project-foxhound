/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  UrlbarTestUtils: "resource://testing-common/UrlbarTestUtils.sys.mjs",
});

add_task(async function test_RefreshTestPrefFunction() {
  await initGroupDatabase();

  window.gURLBar.value = "";

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "refresh",
    waitForFocus: SimpleTest.waitForFocus,
  });
  let row = UrlbarTestUtils.getRowAt(window, 1);
  let refreshButton = row.querySelector("span[data-action='refresh']");
  ok(refreshButton, "Refresh button should be visible");

  window.gURLBar.value = "";
  await SpecialPowers.popPrefEnv();
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "refresh",
    waitForFocus: SimpleTest.waitForFocus,
  });
  row = UrlbarTestUtils.getRowAt(window, 1);
  // row 0 is always the "Search with <default engine>" item
  refreshButton = row.querySelector("span[data-action='refresh']");
  ok(refreshButton, "Refresh button should be visible");
});
