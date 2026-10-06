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

function shownCount() {
  return Glean.ipprotection.breakageMessageShown.testGetValue()?.length ?? 0;
}

function dismissedCount() {
  return (
    Glean.ipprotection.breakageMessageDismissed.testGetValue()?.length ?? 0
  );
}

add_setup(async function () {
  registerCleanupFunction(() => {
    resetState();
  });
});

// Showing the breakage notification records a breakage_message_shown event and
// no breakage_message_dismissed event.
add_task(async function test_shown_event_recorded() {
  Services.fog.testResetFOG();
  setBreakage(BREAKAGE);

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab);

  await TestUtils.waitForCondition(
    () => shownCount() >= 1,
    "breakage_message_shown recorded once the notification is shown"
  );
  Assert.equal(shownCount(), 1, "Exactly one shown event");
  Assert.equal(dismissedCount(), 0, "No dismissed event yet");

  BrowserTestUtils.removeTab(tab);
  resetState();
});

// Dismissing the breakage notification records a breakage_message_dismissed
// event.
add_task(async function test_dismissed_event_recorded() {
  Services.fog.testResetFOG();
  setBreakage(BREAKAGE);

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab);
  getNotification(tab).dismiss();

  await TestUtils.waitForCondition(
    () => dismissedCount() >= 1,
    "breakage_message_dismissed recorded after dismiss"
  );
  Assert.equal(dismissedCount(), 1, "Exactly one dismissed event");

  await TestUtils.waitForCondition(
    () => getNotifiedDomains().includes(TEST_DOMAIN),
    "notifiedDomains pref updated after dismiss"
  );

  BrowserTestUtils.removeTab(tab);
  resetState();
});

// Hiding the notification without a user dismiss (navigating away) does not
// record a breakage_message_dismissed event.
add_task(async function test_navigation_does_not_record_dismiss() {
  Services.fog.testResetFOG();
  setBreakage(BREAKAGE);

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  await waitForNotification(tab);

  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "https://example.org/"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await waitForNoNotification(tab);

  Assert.equal(dismissedCount(), 0, "Navigation must not record a dismiss");

  BrowserTestUtils.removeTab(tab);
  resetState();
});
