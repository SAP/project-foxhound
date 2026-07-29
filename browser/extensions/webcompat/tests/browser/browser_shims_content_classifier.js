"use strict";

const TEST_TOP_PAGE = "https://example.com";
const TRACKER_DOMAIN = "itisatracker.org";
const CONTENT_CLASSIFIER_FETCH_URL = `https://${TRACKER_DOMAIN}/browser/browser/extensions/webcompat/tests/browser/shims_test_fetch.txt`;
const CONTENT_CLASSIFIER_NO_SHIM_FETCH_URL =
  "https://example.org/browser/browser/extensions/webcompat/tests/browser/shims_test_fetch.txt";

add_setup(async function () {
  await UrlClassifierTestUtils.addTestTrackers();
  await generateTestShims();

  registerCleanupFunction(() => {
    UrlClassifierTestUtils.cleanupTestTrackers();
    Services.prefs.clearUserPref(TRACKING_PREF);
    Services.prefs.clearUserPref(
      "privacy.trackingprotection.allow_list.hasUserInteractedWithETPSettings"
    );
  });
});

async function fetchAndGetContentBlockingState(browser, fetchUrl, blockedHost) {
  const fetchResult = await SpecialPowers.spawn(
    browser,
    [fetchUrl],
    async url => {
      return content.fetch(url).then(
        ok => ok.text().then(t => t.trim()),
        _error => "BLOCKED"
      );
    }
  );

  const log = JSON.parse(await browser.getContentBlockingLog());
  const origin = `https://${blockedHost}`;
  const entries = log[origin] || [];

  return { fetchResult, entries };
}

// Verify that the shim replaces the fetch request blocked by the content
// classifier.
add_task(async function test_content_classifier_shim_replaces() {
  Services.prefs.setBoolPref(TRACKING_PREF, false);
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_shims.MochitestShimContent",
    false
  );
  await enableContentClassifierBlockList(CONTENT_CLASSIFIER_BLOCK_LIST_URL);
  await WebCompatExtension.shimsReady();
  await waitForShimEnabledState("MochitestShimContent", true);

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );

  const { entries } = await fetchAndGetContentBlockingState(
    tab.linkedBrowser,
    CONTENT_CLASSIFIER_FETCH_URL,
    TRACKER_DOMAIN
  );

  ok(
    entries.some(
      e => e[0] === Ci.nsIWebProgressListener.STATE_REPLACED_TRACKING_CONTENT
    ),
    "Content classifier hit was replaced by the shim listener"
  );
  ok(
    !entries.some(
      e => e[0] === Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT
    ),
    "Channel was not blocked"
  );

  await BrowserTestUtils.removeTab(tab);
  Services.prefs.clearUserPref(
    "extensions.webcompat.disabled_shims.MochitestShimContent"
  );
  disableContentClassifier();
  Services.prefs.clearUserPref(TRACKING_PREF);
});

// Test with the shim disabled, and the fetch to a tracker domain should remain
// blocked by the content classifier.
add_task(async function test_content_classifier_shim_disabled_falls_through() {
  Services.prefs.setBoolPref(TRACKING_PREF, false);
  await enableContentClassifierBlockList(CONTENT_CLASSIFIER_BLOCK_LIST_URL);
  await WebCompatExtension.shimsReady();

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );

  const { fetchResult, entries } = await fetchAndGetContentBlockingState(
    tab.linkedBrowser,
    CONTENT_CLASSIFIER_FETCH_URL,
    TRACKER_DOMAIN
  );

  is(
    fetchResult,
    "BLOCKED",
    "Fetch was blocked by content classifier when no shim is active"
  );
  ok(
    entries.some(
      e => e[0] === Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT
    ),
    "Channel was blocked by the content classifier"
  );

  await BrowserTestUtils.removeTab(tab);
  disableContentClassifier();
  Services.prefs.clearUserPref(TRACKING_PREF);
});

// Verify that the shim does not replace the fetch request when no shim matches
// and the content classifier still blocks it.
add_task(async function test_content_classifier_no_shim_match() {
  Services.prefs.setBoolPref(TRACKING_PREF, false);
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_shims.MochitestShimContent",
    false
  );
  await enableContentClassifierBlockList(CONTENT_CLASSIFIER_BLOCK_LIST_URL);
  await WebCompatExtension.shimsReady();
  await waitForShimEnabledState("MochitestShimContent", true);

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );

  const { fetchResult, entries } = await fetchAndGetContentBlockingState(
    tab.linkedBrowser,
    CONTENT_CLASSIFIER_NO_SHIM_FETCH_URL,
    "example.org"
  );

  is(
    fetchResult,
    "BLOCKED",
    "Fetch was blocked by content classifier when no shim matches"
  );
  ok(
    entries.some(
      e => e[0] === Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT
    ),
    "Channel was blocked by the content classifier"
  );

  await BrowserTestUtils.removeTab(tab);
  Services.prefs.clearUserPref(
    "extensions.webcompat.disabled_shims.MochitestShimContent"
  );
  disableContentClassifier();
  Services.prefs.clearUserPref(TRACKING_PREF);
});
