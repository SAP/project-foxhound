/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_PAGE_NORMAL = TEST_PATH + "empty.html";
const TEST_PAGE_FINGERPRINTER = TEST_PATH + "canvas-fingerprinter.html";

// Glean labeled counter metric name
const GLEAN_METRIC = "canvas_fingerprinting_per_tab2";

const KEY_UNKNOWN = "not_found";
const KEY_KNOWN_TEXT = "found";

async function clearTelemetry() {
  // Clear Glean metrics between tests to ensure isolation.
  // The test-only clearing API is exposed via FOG in Firefox.
  // This clears all metrics; acceptable for test isolation.
  Services.fog.testResetFOG();
}

async function getLabeledCounter(metricName, label, checkCntFn) {
  // Wait until the labeled counter appears with a value.
  let value = 0;
  await TestUtils.waitForCondition(() => {
    value =
      Glean.contentblocking.canvasFingerprintingPerTab2[label].testGetValue();
    return checkCntFn ? checkCntFn(value) : value > 0;
  });
  return value;
}

async function checkLabeledCounter(metricName, label, expectedCnt) {
  let cnt = await getLabeledCounter(metricName, label, v => {
    return (v ?? 0) == expectedCnt;
  });
  is(cnt, expectedCnt, "Expected count in Glean labeled counter.");
}

add_setup(async function () {
  await clearTelemetry();
});

add_task(async function test_canvas_fingerprinting_telemetry() {
  let promiseWindowDestroyed = BrowserUtils.promiseObserved(
    "window-global-destroyed"
  );

  // First, we open a page without any canvas fingerprinters
  await BrowserTestUtils.withNewTab(TEST_PAGE_NORMAL, async _ => {});

  // Make sure the tab was closed properly before checking Telemetry.
  await promiseWindowDestroyed;

  // Check that the telemetry has been record properly for normal page. The
  // telemetry should show there was no known fingerprinting attempt.
  await checkLabeledCounter(GLEAN_METRIC, KEY_UNKNOWN, 1);

  await clearTelemetry();
});

add_task(async function test_canvas_fingerprinting_telemetry() {
  let promiseWindowDestroyed = BrowserUtils.promiseObserved(
    "window-global-destroyed"
  );

  // Now open a page with a canvas fingerprinter
  await BrowserTestUtils.withNewTab(TEST_PAGE_FINGERPRINTER, async _ => {});

  // Make sure the tab was closed properly before checking Telemetry.
  await promiseWindowDestroyed;

  // The telemetry should show a a known fingerprinting text and a known
  // canvas fingerprinter.
  // CanvasFingerprinter::eVariant4 encoded under label KEY_KNOWN_TEXT
  await checkLabeledCounter(GLEAN_METRIC, KEY_KNOWN_TEXT, 1);

  await clearTelemetry();
});
