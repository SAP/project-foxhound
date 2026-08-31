/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

const TRACKING_PAGE =
  "https://tracking.example.org/browser/toolkit/components/antitracking/test/browser/trackingPage.html";
const NOTIFICATION_VALUE = "reduced-protection-reload";

function getNotification(browser) {
  let notificationBox = browser.getTabBrowser()?.getNotificationBox(browser);
  return notificationBox?.getNotificationWithValue(NOTIFICATION_VALUE);
}

function waitForContentBlockingEvent(aBrowser) {
  return new Promise(resolve => {
    let listener = {
      onContentBlockingEvent(webProgress, request, event) {
        if (event & Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT) {
          aBrowser.removeProgressListener(listener);
          resolve();
        }
      },
    };
    aBrowser.addProgressListener(listener);
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.privatebrowsing.autostart", true],
      ["privacy.trackingprotection.enabled", true],
      ["privacy.reducePageProtection.infobar.enabled.pbmode", true],
    ],
  });

  await UrlClassifierTestUtils.addTestTrackers();

  registerCleanupFunction(() => {
    UrlClassifierTestUtils.cleanupTestTrackers();
  });
});

// The infobar must not appear in permanent private browsing mode, even after a
// reload of a page that blocked trackers.
add_task(async function test_no_infobar_in_permanent_private_browsing() {
  let pbWindow = await BrowserTestUtils.openNewBrowserWindow({ private: true });

  let blockingPromise = waitForContentBlockingEvent(pbWindow.gBrowser);
  let tab = await BrowserTestUtils.openNewForegroundTab(
    pbWindow.gBrowser,
    TRACKING_PAGE
  );
  await blockingPromise;

  let loadedPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  pbWindow.gBrowser.reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_NONE);
  await loadedPromise;

  await TestUtils.waitForTick();

  let notification = getNotification(tab.linkedBrowser);
  ok(!notification, "No infobar in permanent private browsing mode");

  BrowserTestUtils.removeTab(tab);
  await BrowserTestUtils.closeWindow(pbWindow);
});
