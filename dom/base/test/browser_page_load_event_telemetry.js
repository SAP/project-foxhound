"use strict";

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

const ALL_CHANNELS = Ci.nsITelemetry.DATASET_ALL_CHANNELS;

add_task(async function() {
  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    waitForLoad: true,
  });

  let browser = tab.linkedBrowser;

  // Reset event counts.
  Services.telemetry.clearEvents();
  TelemetryTestUtils.assertNumberOfEvents(0);

  // Add checks for pageload ping and pageload event
  let pingSubmitted = false;
  GleanPings.pageload.testBeforeNextSubmit(reason => {
    pingSubmitted = true;
    Assert.equal(reason, "threshold");
    let record = Glean.perf.pageLoad.testGetValue();
    Assert.greaterOrEqual(
      record.length,
      30,
      "Should have at least 30 page load events"
    );
  });

  // Perform page load 30 times to trigger the ping being sent
  for (let i = 0; i < 30; i++) {
    BrowserTestUtils.loadURIString(browser, "https://example.com");
    await BrowserTestUtils.browserLoaded(browser);
  }

  await BrowserTestUtils.waitForCondition(
    () => pingSubmitted,
    "Page load ping should have been submitted."
  );

  BrowserTestUtils.removeTab(tab);
});
