/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPProxyManager, IPPProxyStates } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs"
);

const { Region } = ChromeUtils.importESModule(
  "resource://gre/modules/Region.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const PREF_DYNAMIC_TAB_BREAKAGES =
  "extensions.ippactivator.dynamicTabBreakages";
const PREF_NOTIFIED_DOMAINS = "extensions.ippactivator.notifiedDomains";

const NOTIFICATION_ID = "ipp-activator-notification";
const BREAKAGE_L10N_ID = "ipp-activator-breakage-turn-off-warning";

const TEST_DOMAIN = "example.com";
const TEST_URL = `https://${TEST_DOMAIN}/`;

function getNotification(tab) {
  const nbox = gBrowser.getNotificationBox(tab.linkedBrowser);
  return nbox.getNotificationWithValue(NOTIFICATION_ID);
}

function waitForNotification(tab) {
  return TestUtils.waitForCondition(
    () => getNotification(tab),
    `Waiting for ${NOTIFICATION_ID} on tab`
  );
}

function waitForNoNotification(tab) {
  return TestUtils.waitForCondition(
    () => !getNotification(tab),
    `Waiting for ${NOTIFICATION_ID} to be gone on tab`
  );
}

function resetState() {
  Services.prefs.clearUserPref(PREF_DYNAMIC_TAB_BREAKAGES);
  Services.prefs.clearUserPref(PREF_NOTIFIED_DOMAINS);
}

async function checkNotification(condition, shouldShow, action) {
  Services.prefs.setStringPref(
    PREF_DYNAMIC_TAB_BREAKAGES,
    JSON.stringify([
      { domains: [TEST_DOMAIN], l10nId: BREAKAGE_L10N_ID, condition },
    ])
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  try {
    if (shouldShow) {
      await waitForNotification(tab);
      Assert.ok(
        true,
        `Notification shown for condition ${JSON.stringify(condition)}`
      );
    } else {
      // Poll for up to ~500ms; if a notification ever appears we fail
      // early, otherwise the wait times out and the assertion passes.
      await BrowserTestUtils.waitForCondition(
        () => getNotification(tab),
        "watching for an unexpected notification",
        50,
        10
      ).catch(() => {});
      Assert.equal(
        getNotification(tab),
        null,
        `No notification for condition ${JSON.stringify(condition)}`
      );
    }

    if (action) {
      await action(tab);
    }
  } finally {
    BrowserTestUtils.removeTab(tab);
    resetState();
  }
}
