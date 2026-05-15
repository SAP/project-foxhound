/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const GETHASH_URL = "http://mochi.test:8888/" + TEST_PATH + "gethashV5.sjs?";

const TEST_DOMAIN_IN_CACHE = "https://globalcache-test.example.com/";
const TEST_DOMAIN_NOT_IN_CACHE = "https://not-in-cache.example.com/";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

function waitForGlobalCacheNotification(expectedResult) {
  return new Promise(resolve => {
    let start = Date.now();
    function observer(subject, topic, data) {
      Services.obs.removeObserver(observer, "urlclassifier-globalcache-result");
      info(
        `GlobalCache notification received: ${data} (after ${Date.now() - start}ms)`
      );
      is(
        data,
        expectedResult,
        `Should receive a GlobalCache ${expectedResult} notification`
      );
      resolve(data);
    }
    Services.obs.addObserver(observer, "urlclassifier-globalcache-result");
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.safebrowsing.realTime.enabled", true],
      ["browser.safebrowsing.realTime.debug", true],
      ["browser.safebrowsing.globalCache.enabled", true],
      ["browser.safebrowsing.provider.google5.enabled", true],
      [
        "browser.safebrowsing.provider.google5.excludeFromGoogleSafeBrowsingKeyCheck",
        true,
      ],
      ["browser.safebrowsing.provider.google5.gethashURL", GETHASH_URL],
    ],
  });
});

// Verify the case where the URL is in the GlobalCache table.
add_task(async function test_globalcache_hit() {
  info("Testing GlobalCache hit scenario");

  await UrlClassifierTestUtils.addTestV5Entry();

  let notificationPromise = waitForGlobalCacheNotification("hit");

  let tab = BrowserTestUtils.addTab(gBrowser, TEST_DOMAIN_IN_CACHE);

  await notificationPromise;

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
});

// Verify the case where the URL is not in the GlobalCache table.
add_task(async function test_globalcache_miss() {
  info("Testing GlobalCache miss scenario");

  let notificationPromise = waitForGlobalCacheNotification("miss");

  let tab = BrowserTestUtils.addTab(gBrowser, TEST_DOMAIN_NOT_IN_CACHE);

  await notificationPromise;

  await BrowserTestUtils.removeTab(tab);
});

// Verify that we will proceed with a local lookup if the URL is in the
// GlobalCache table.
add_task(async function test_globalcache_hit_and_malware_blocked() {
  info("Testing GlobalCache hit with malware blocking");

  // Add malware.example.com to both the malware table (4-byte) and
  // the GlobalCache table (32-byte).
  const MALWARE_HOST = "malware.example.com/";
  const TEST_MALWARE_URL = "https://malware.example.com/";

  await UrlClassifierTestUtils.addTestV5Entry(MALWARE_HOST);

  let notificationPromise = waitForGlobalCacheNotification("hit");

  let tab = BrowserTestUtils.addTab(gBrowser, TEST_MALWARE_URL);

  let blockedPromise = BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "AboutBlockedLoaded",
    true,
    undefined,
    true
  );

  // Wait for both the notification and the page to be blocked.
  await Promise.all([notificationPromise, blockedPromise]);

  ok(true, "The page should be blocked.");

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
});
