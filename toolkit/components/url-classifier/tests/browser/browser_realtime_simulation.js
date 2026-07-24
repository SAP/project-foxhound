/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// The URL will guarantee to trigger a real-time request.
const TEST_URL = "https://www.example.com/";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

function waitForSimulationResult() {
  return new Promise(resolve => {
    function observer(subject, topic, data) {
      Services.obs.removeObserver(
        observer,
        "urlclassifier-realtime-simulation-result"
      );
      let [wouldSendRequest, requestBytes, responseBytes] = data.split(",");
      resolve({
        wouldSendRequest: wouldSendRequest === "1",
        requestBytes: parseInt(requestBytes, 10),
        responseBytes: parseInt(responseBytes, 10),
      });
    }
    Services.obs.addObserver(
      observer,
      "urlclassifier-realtime-simulation-result"
    );
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.safebrowsing.realTime.enabled", true],
      ["browser.safebrowsing.realTime.debug", true],
      ["browser.safebrowsing.globalCache.enabled", true],
      ["browser.safebrowsing.realTime.simulation.enabled", true],
      ["browser.safebrowsing.realTime.simulation.cacheTTLSec", 1],
    ],
  });

  registerCleanupFunction(async () => {
    UrlClassifierTestUtils.cleanRealTimeSimulatorCache();
    Services.prefs.clearUserPref(
      "privacy.trackingprotection.allow_list.hasUserInteractedWithETPSettings"
    );
  });
});

// Test that the simulator sends a notification when processing a URL.
add_task(async function test_simulation_notification() {
  info("Testing simulation notification");

  UrlClassifierTestUtils.cleanRealTimeSimulatorCache();

  // Set the hit probability to 0.0 so we always get a cache miss.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.safebrowsing.realTime.simulation.hitProbability", 0]],
  });

  await UrlClassifierTestUtils.addTestV5Entry();

  let resultPromise = waitForSimulationResult();

  let tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);

  let result = await resultPromise;

  ok(result.wouldSendRequest, "Should indicate a request would be sent");
  Assert.greater(
    result.requestBytes,
    0,
    "Request bytes should be greater than 0"
  );
  is(result.responseBytes, 5, "Response bytes should be 5 (no hits)");

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
});

// Test that the telemetry is properly recorded.
add_task(async function test_simulation_telemetry() {
  info("Testing simulation telemetry recording");

  Services.fog.testResetFOG();
  UrlClassifierTestUtils.cleanRealTimeSimulatorCache();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentblocking.category", "standard"],
      ["browser.safebrowsing.realTime.simulation.hitProbability", 0],
    ],
  });

  await UrlClassifierTestUtils.addTestV5Entry();

  let resultPromise = waitForSimulationResult();
  let tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);
  let result = await resultPromise;

  ok(result.wouldSendRequest, "Request should be sent");

  // Verify Global Cache telemetry.
  is(
    Glean.urlclassifier.globalCacheMiss.standard_normal.testGetValue(),
    1,
    "Global cache miss should be recorded for standard_normal"
  );
  is(
    Glean.urlclassifier.globalCacheHit.standard_normal.testGetValue(),
    null,
    "No global cache hit should be recorded"
  );

  // Verify simulation telemetry.
  is(
    Glean.urlclassifier.realtimeSimulationRequestCount.standard_normal.testGetValue(),
    1,
    "Request count should be 1 for standard_normal"
  );
  Assert.greater(
    Glean.urlclassifier.realtimeSimulationRequestSize.standard_normal.testGetValue(),
    0,
    "Request size should be greater than 0"
  );
  is(
    Glean.urlclassifier.realtimeSimulationResponseSize.standard_normal.testGetValue(),
    5,
    "Response size should be 5 (no hits)"
  );

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
  await SpecialPowers.popPrefEnv();
});

// Test that globalCacheHit telemetry is recorded when the URL is in the cache.
add_task(async function test_global_cache_hit_telemetry() {
  info("Testing global cache hit telemetry");

  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.category", "standard"]],
  });

  await UrlClassifierTestUtils.addTestV5Entry();

  let notificationPromise = new Promise(resolve => {
    function observer(subject, topic, data) {
      Services.obs.removeObserver(observer, "urlclassifier-globalcache-result");
      resolve(data);
    }
    Services.obs.addObserver(observer, "urlclassifier-globalcache-result");
  });

  let tab = BrowserTestUtils.addTab(
    gBrowser,
    "https://globalcache-test.example.com/"
  );
  let result = await notificationPromise;

  is(result, "hit", "Should get a global cache hit");

  // Verify Global Cache hit telemetry.
  is(
    Glean.urlclassifier.globalCacheHit.standard_normal.testGetValue(),
    1,
    "Global cache hit should be recorded for standard_normal"
  );
  is(
    Glean.urlclassifier.globalCacheMiss.standard_normal.testGetValue(),
    null,
    "No global cache miss should be recorded"
  );

  // Verify no simulation telemetry is recorded for a cache hit.
  is(
    Glean.urlclassifier.realtimeSimulationRequestCount.standard_normal.testGetValue(),
    null,
    "No simulation request count for global cache hit"
  );

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
  await SpecialPowers.popPrefEnv();
});

// Test telemetry with strict ETP mode and private window.
add_task(async function test_simulation_telemetry_strict_private() {
  info("Testing simulation telemetry with strict ETP in private window");

  Services.fog.testResetFOG();
  UrlClassifierTestUtils.cleanRealTimeSimulatorCache();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentblocking.category", "strict"],
      ["browser.safebrowsing.realTime.simulation.hitProbability", 0],
    ],
  });

  await UrlClassifierTestUtils.addTestV5Entry();

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let resultPromise = waitForSimulationResult();
  let tab = BrowserTestUtils.addTab(privateWin.gBrowser, TEST_URL);
  let result = await resultPromise;

  ok(result.wouldSendRequest, "Request should be sent");

  // Verify telemetry is recorded under strict_private.
  is(
    Glean.urlclassifier.globalCacheMiss.strict_private.testGetValue(),
    1,
    "Global cache miss should be recorded for strict_private"
  );
  is(
    Glean.urlclassifier.realtimeSimulationRequestCount.strict_private.testGetValue(),
    1,
    "Request count should be 1 for strict_private"
  );
  Assert.greater(
    Glean.urlclassifier.realtimeSimulationRequestSize.strict_private.testGetValue(),
    0,
    "Request size should be greater than 0 for strict_private"
  );

  // Verify no telemetry recorded for standard_normal.
  is(
    Glean.urlclassifier.realtimeSimulationRequestCount.standard_normal.testGetValue(),
    null,
    "No request count should be recorded for standard_normal"
  );

  await BrowserTestUtils.removeTab(tab);
  await BrowserTestUtils.closeWindow(privateWin);
  UrlClassifierTestUtils.cleanupTestV5Entry();
  await SpecialPowers.popPrefEnv();
});

// Test that the simulator caches results and doesn't send duplicate requests.
add_task(async function test_simulation_cache() {
  info("Testing simulation cache behavior");

  UrlClassifierTestUtils.cleanRealTimeSimulatorCache();

  await UrlClassifierTestUtils.addTestV5Entry();

  // Set hit probability to 1000000 (100%) so we always get a cache entry.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.safebrowsing.realTime.simulation.hitProbability", 1000000]],
  });

  // First request should be sent.
  let resultPromise = waitForSimulationResult();
  let tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);
  let result = await resultPromise;

  ok(result.wouldSendRequest, "First request should be sent");
  Assert.greater(
    result.requestBytes,
    0,
    "Request bytes should be greater than 0"
  );
  Assert.greater(
    result.responseBytes,
    5,
    "Response bytes should include hit data"
  );

  await BrowserTestUtils.removeTab(tab);

  // Second request to the same URL should hit the cache.
  resultPromise = waitForSimulationResult();
  tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);
  result = await resultPromise;

  ok(!result.wouldSendRequest, "Second request should hit cache");
  is(result.requestBytes, 0, "No request bytes for cache hit");
  is(result.responseBytes, 0, "No response bytes for cache hit");

  await BrowserTestUtils.removeTab(tab);

  // Wait for cache to expire.
  info("Waiting for cache to expire");
  /* eslint-disable mozilla/no-arbitrary-setTimeout */
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Third request should be sent again after cache expiry.
  resultPromise = waitForSimulationResult();
  tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);
  result = await resultPromise;

  ok(
    result.wouldSendRequest,
    "Third request should be sent after cache expiry"
  );
  Assert.greater(
    result.requestBytes,
    0,
    "Request bytes should be greater than 0 after expiry"
  );
  Assert.greater(
    result.responseBytes,
    5,
    "Response bytes should include hit data after expiry"
  );

  await BrowserTestUtils.removeTab(tab);
  UrlClassifierTestUtils.cleanupTestV5Entry();
});
