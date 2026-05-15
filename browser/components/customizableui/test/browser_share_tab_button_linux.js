/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL = BASE + "browser_shareurl.html";

add_task(async function test_button() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    CustomizableUI.addWidgetToArea(
      "share-tab-button",
      CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
    );
    registerCleanupFunction(() => CustomizableUI.reset());

    await waitForOverflowButtonShown();

    await document.getElementById("nav-bar").overflowable.show();
    info("Menu panel was opened");

    let shareTabButton = document.getElementById("share-tab-button");
    ok(shareTabButton, "Share tab button appears in Panel Menu");

    await SimpleTest.promiseClipboardChange(TEST_URL, () =>
      shareTabButton.click()
    );

    ok(true, "Copy works on linux");
    ok(!isOverflowOpen(), "The overflow menu should close on click");
  });
});
