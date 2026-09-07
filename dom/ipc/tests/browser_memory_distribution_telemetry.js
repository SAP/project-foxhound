"use strict";

const { TelemetrySession } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetrySession.sys.mjs"
);

const DUMMY_PAGE_DATA_URI = `data:text/html,
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Dummy</title>
      </head>
      <body>
        <h1 id='header'>Just a regular everyday normal page.</h1>
      </body>
    </html>`;

/**
 * Tests the memory.distributionAmongContent probe by opening a few tabs, then triggering
 * the memory probes and waiting for the "gather-memory-telemetry-finished" notification.
 */
add_task(async function test_memory_distribution() {
  waitForExplicitFinish();

  if (SpecialPowers.getIntPref("dom.ipc.processCount", 1) < 2) {
    ok(true, "Skip this test if e10s-multi is disabled.");
    finish();
    return;
  }

  Services.telemetry.canRecordExtended = true;

  Services.fog.testResetFOG();

  let tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    DUMMY_PAGE_DATA_URI
  );
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    DUMMY_PAGE_DATA_URI
  );
  let tab3 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    DUMMY_PAGE_DATA_URI
  );

  let finishedGathering = new Promise(resolve => {
    let obs = function () {
      Services.obs.removeObserver(obs, "gather-memory-telemetry-finished");
      resolve();
    };
    Services.obs.addObserver(obs, "gather-memory-telemetry-finished");
  });

  TelemetrySession.getPayload();

  await finishedGathering;
  await Services.fog.testFlushAllChildren();

  const label = "0 - 10 tabs";
  const fewTabsSnapshot =
    Glean.memory.distributionAmongContent[label].testGetValue();
  ok(fewTabsSnapshot, `We should have some samples by now in ${label}.`);
  Assert.greater(
    fewTabsSnapshot.sum,
    0,
    "Zero difference between all the content processes is unlikely, what happened?"
  );
  Assert.less(
    fewTabsSnapshot.sum,
    80,
    "20 percentage difference on average is unlikely, what happened?"
  );
  let values = fewTabsSnapshot.values;
  for (let [bucket, value] of Object.entries(values)) {
    if (bucket >= 10) {
      // If this check fails it means that one of the content processes uses at least 20% more or 20% less than the mean.
      is(value, 0, "All the buckets above 10 should be empty");
    }
  }

  BrowserTestUtils.removeTab(tab3);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab1);
  finish();
});
