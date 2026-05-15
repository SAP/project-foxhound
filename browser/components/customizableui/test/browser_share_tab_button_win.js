/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL = BASE + "browser_shareurl.html";

let shareUrlSpy = sinon.spy();

SharingUtils.testOnlyMockUIUtils({
  shareUrl(url, title) {
    shareUrlSpy(url, title);
  },
  QueryInterface: ChromeUtils.generateQI([Ci.nsIWindowsUIUtils]),
});

registerCleanupFunction(function () {
  SharingUtils.testOnlyMockUIUtils(null);
});

async function openShareTabButton() {
  await waitForOverflowButtonShown();
  await document.getElementById("nav-bar").overflowable.show();

  let shareTabButton = document.getElementById("share-tab-button");
  return shareTabButton;
}

add_setup(async function () {
  CustomizableUI.addWidgetToArea(
    "share-tab-button",
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );
  registerCleanupFunction(() => CustomizableUI.reset());
});

add_task(async function test_button_exists() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let shareTabButton = await openShareTabButton();
    Assert.ok(shareTabButton, "Share tab button appears in Panel Menu");
    await hideOverflow();
  });
});

add_task(async function test_share_button_click() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    shareUrlSpy.resetHistory();

    let shareTabButton = await openShareTabButton();
    shareTabButton.click();

    ok(shareUrlSpy.calledOnce, "shareUrl was called");

    let [url, title] = shareUrlSpy.getCall(0).args;
    is(url, TEST_URL, "Shared correct URL");
    is(title, "Sharing URL", "Shared correct title");
    if (isOverflowOpen()) {
      await hideOverflow();
    }
  });
});
