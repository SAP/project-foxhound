/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

const EXAMPLE_URL = "https://example.com/1";

async function testModifiedClickWithKey(modifierKey, description) {
  let tabOne = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXAMPLE_URL
  );

  let tabTwo = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "example %",
  });

  let resultCount = UrlbarTestUtils.getResultCount(window);
  let tabResult = null;

  for (let i = 0; i < resultCount; i++) {
    let result = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
    if (result.type === UrlbarUtils.RESULT_TYPE.TAB_SWITCH) {
      tabResult = result;
      break;
    }
  }

  Assert.ok(
    tabResult,
    "Tab switch result should be present in the autocomplete results"
  );

  let resultElement = tabResult.element.row;
  let initialTabCount = gBrowser.tabs.length;

  let eventOptions = { type: "click" };
  eventOptions[modifierKey] = true;

  EventUtils.sendMouseEvent(eventOptions, resultElement);

  Assert.equal(
    gBrowser.tabs.length,
    initialTabCount,
    `Tab count should remain the same after ${description}`
  );

  BrowserTestUtils.removeTab(tabTwo);
  BrowserTestUtils.removeTab(tabOne);
}

add_task(async function test_shiftClick() {
  await testModifiedClickWithKey("shiftKey", "Shift-click");
});

add_task(async function test_metaClick() {
  await testModifiedClickWithKey("metaKey", "Meta-click");
});

add_task(async function test_ctrlClick() {
  await testModifiedClickWithKey("ctrlKey", "Ctrl-click");
});
