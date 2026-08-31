/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

add_setup(async function () {
  await UrlClassifierTestUtils.addTestTrackers();

  registerCleanupFunction(function () {
    UrlClassifierTestUtils.cleanupTestTrackers();
  });
});

async function waitForTimingDistribution(metric, minCount = 1) {
  await TestUtils.waitForCondition(() => {
    let value = metric.testGetValue();
    return value && value.count >= minCount;
  }, `timing_distribution should record at least ${minCount} sample(s)`);
  return metric.testGetValue();
}

add_task(async function test_check_channel_helper_telemetry() {
  Services.fog.testResetFOG();

  is(
    Glean.urlclassifier.checkChannelHelperTime.testGetValue(),
    null,
    "checkChannelHelperTime starts unset"
  );
  is(
    Glean.urlclassifier.checkChannelHelperWorkerTime.testGetValue(),
    null,
    "checkChannelHelperWorkerTime starts unset"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);

  let outer = await waitForTimingDistribution(
    Glean.urlclassifier.checkChannelHelperTime
  );
  let worker = await waitForTimingDistribution(
    Glean.urlclassifier.checkChannelHelperWorkerTime
  );

  Assert.greater(
    outer.count,
    0,
    "checkChannelHelperTime should record samples"
  );
  Assert.greater(outer.sum, 0, "checkChannelHelperTime sum should be > 0");

  Assert.greater(
    worker.count,
    0,
    "checkChannelHelperWorkerTime should record samples"
  );
  Assert.greater(
    worker.sum,
    0,
    "checkChannelHelperWorkerTime sum should be > 0"
  );

  Assert.lessOrEqual(
    worker.sum,
    outer.sum,
    "worker time should be a subset of total time"
  );

  await BrowserTestUtils.removeTab(tab);
});

function countOf(metric) {
  let value = metric.testGetValue();
  return value ? value.count : 0;
}

add_task(async function test_check_channel_helper_telemetry_defer_pref_on() {
  // With the defer pref on, a tracker subresource is classified in two phases:
  // a blocking phase before connect, and an annotation-only phase before
  // processing the response. The probe is intentionally scoped to the
  // blocking phase only, so the annotation-only second phase must not add
  // samples.
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.defer_annotation.enabled", true],
      ["privacy.trackingprotection.enabled", true],
      ["privacy.trackingprotection.annotate_channels", true],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);

  let outerBefore = countOf(Glean.urlclassifier.checkChannelHelperTime);
  let workerBefore = countOf(Glean.urlclassifier.checkChannelHelperWorkerTime);

  await loadImage(
    tab.linkedBrowser,
    "https://tracking.example.org/" + TEST_PATH + "raptor.jpg"
  );

  let outer = await waitForTimingDistribution(
    Glean.urlclassifier.checkChannelHelperTime,
    outerBefore + 1
  );
  let worker = await waitForTimingDistribution(
    Glean.urlclassifier.checkChannelHelperWorkerTime,
    workerBefore + 1
  );

  Assert.equal(
    outer.count - outerBefore,
    1,
    "tracker image adds exactly one checkChannelHelperTime sample (blocking phase only; annotation-only phase must not record)"
  );
  Assert.equal(
    worker.count - workerBefore,
    1,
    "tracker image adds exactly one checkChannelHelperWorkerTime sample under pref ON"
  );
  Assert.lessOrEqual(
    worker.sum,
    outer.sum,
    "worker time should be a subset of total time under pref ON"
  );

  await BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
