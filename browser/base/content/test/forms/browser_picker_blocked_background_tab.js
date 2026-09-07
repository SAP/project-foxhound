/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function withBackgroundTab(url, fn) {
  let backgroundTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url
  );
  let foregroundTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url
  );

  try {
    await fn(backgroundTab.linkedBrowser, foregroundTab.linkedBrowser);
  } finally {
    BrowserTestUtils.removeTab(foregroundTab);
    BrowserTestUtils.removeTab(backgroundTab);
  }
}

async function testPicker(cb, { shouldOpen }) {
  let shownTarget = null;
  let onShown = e => (shownTarget = e.target);
  document.addEventListener("popupshowing", onShown);

  await cb();

  // For the current subtests, no timeout is needed. The IPC roundtrip in cb()
  // and microtask checkpoint from awaiting cb is enough for the popup to show.

  document.removeEventListener("popupshowing", onShown);
  shownTarget?.hidePopup();

  if (shouldOpen) {
    ok(shownTarget, "Expected picker to show");
  } else {
    ok(!shownTarget, "Expected picker not to be shown");
  }
}

function showPicker(browser, selector) {
  return SpecialPowers.spawn(browser, [selector], sel => {
    content.document.notifyUserGestureActivation();
    content.document.querySelector(sel).showPicker();
  });
}

add_task(async function test_select_picker_blocked_in_background_tab() {
  const url =
    "data:text/html,<select><option>A</option><option>B</option></select>";
  await withBackgroundTab(url, async (bgBrowser, fgBrowser) => {
    await testPicker(() => showPicker(fgBrowser, "select"), {
      shouldOpen: true,
    });
    await testPicker(() => showPicker(bgBrowser, "select"), {
      shouldOpen: false,
    });
  });
});

add_task(async function test_date_picker_blocked_in_background_tab() {
  const url = "data:text/html,<input type='date'>";
  await withBackgroundTab(url, async (bgBrowser, fgBrowser) => {
    await testPicker(() => showPicker(fgBrowser, "input"), {
      shouldOpen: true,
    });
    await testPicker(() => showPicker(bgBrowser, "input"), {
      shouldOpen: false,
    });
  });
  // Need to remove the iframe to prevent a leak, see DateTimeTestHelper.cleanup()
  // in toolkit/content/tests/browser/datetime/head.js.
  document.getElementById("DateTimePickerPanelPopupFrame")?.remove();
});

add_task(async function test_datalist_picker_blocked_in_background_tab() {
  // The datalist picker uses form fill code, which has two sources of delays
  // - If autocomplete != 'off', FormHistory will do a sql query
  // - nsFormFillController::mTimeout delays the form fill popup
  // See bug 2035124.

  async function clearFormfillDelay(browser) {
    await SpecialPowers.spawn(browser, [], () => {
      Cc["@mozilla.org/satchel/form-fill-controller;1"]
        .getService(Ci.nsIFormFillController)
        .QueryInterface(Ci.nsIAutoCompleteInput).timeout = 0;
    });
  }

  const url =
    "data:text/html,<input list='dl' autocomplete='off'><datalist id='dl'><option value='foo'><option value='bar'></datalist>";
  await withBackgroundTab(url, async (bgBrowser, fgBrowser) => {
    await clearFormfillDelay(bgBrowser);
    await clearFormfillDelay(fgBrowser);
    await testPicker(() => showPicker(fgBrowser, "input"), {
      shouldOpen: true,
    });
    await testPicker(() => showPicker(bgBrowser, "input"), {
      shouldOpen: false,
    });
  });
});
