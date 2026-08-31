/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BREAKAGE = {
  domains: [TEST_DOMAIN],
  l10nId: BREAKAGE_L10N_ID,
  condition: { type: "test", ret: true },
};

function setBreakage(breakage) {
  Services.prefs.setStringPref(
    PREF_DYNAMIC_TAB_BREAKAGES,
    JSON.stringify([breakage])
  );
}

function getNotifiedDomains() {
  return JSON.parse(Services.prefs.getStringPref(PREF_NOTIFIED_DOMAINS, "[]"));
}

async function assertNoNotification(tab) {
  await BrowserTestUtils.waitForCondition(
    () => getNotification(tab),
    "watching for an unexpected notification",
    50,
    10
  ).catch(() => {});
  Assert.equal(getNotification(tab), null, "No notification expected");
}

add_setup(async function () {
  registerCleanupFunction(() => {
    resetState();
  });
});

// Dismissing the banner stores the domain in notifiedDomains; reopening
// the same domain afterwards must not show a banner again.
add_task(async function test_dismiss_records_domain_and_suppresses_future() {
  setBreakage(BREAKAGE);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab1);
  getNotification(tab1).dismiss();

  await TestUtils.waitForCondition(
    () => getNotifiedDomains().includes(TEST_DOMAIN),
    "notifiedDomains pref updated after dismiss"
  );

  BrowserTestUtils.removeTab(tab1);

  const tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await assertNoNotification(tab2);

  BrowserTestUtils.removeTab(tab2);
  resetState();
});

// Dismissing the banner on one tab closes the banner on every other tab
// showing the same domain, and adds the domain to notifiedDomains.
add_task(async function test_dismiss_propagates_to_other_tabs() {
  setBreakage(BREAKAGE);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab1);

  const tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab2);

  getNotification(tab1).dismiss();

  await waitForNoNotification(tab2);
  await TestUtils.waitForCondition(
    () => getNotifiedDomains().includes(TEST_DOMAIN),
    "notifiedDomains pref updated after multi-tab dismiss"
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  resetState();
});

// Navigating the tab to a domain not covered by any breakage hides the
// banner.
add_task(async function test_url_change_hides_banner() {
  setBreakage(BREAKAGE);

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab);

  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "https://example.org/"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  await waitForNoNotification(tab);

  BrowserTestUtils.removeTab(tab);
  resetState();
});
